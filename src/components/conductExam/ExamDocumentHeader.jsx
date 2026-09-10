import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import ep1 from '../../api/ep1';
import global1 from '../../pages/global1';

/**
 * Custom hook to load active Exam Configuration
 */
export function useExamConfig(colidOverride) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const colid = colidOverride || global1.colid || 1;

  const reload = async () => {
    try {
      setLoading(true);
      const res = await ep1.get('/api/v2/conductexam/configuration', { params: { colid } });
      if (res.data?.success) {
        setConfig(res.data.data);
      }
    } catch (err) {
      console.error('[useExamConfig] load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [colid]);

  return { config, loading, reload };
}

/**
 * Standardized Examination Document Header
 * - Renders Institution Name in extra-large bold font
 * - Renders Affiliated Board immediately beneath the Institution Name
 * - Renders Address and contact info
 * - Renders Logo when available
 * - Optional document title / office banner
 */
export default function ExamDocumentHeader({
  config,
  title = '',
  officeTitle = 'OFFICE OF THE CONTROLLER OF EXAMINATIONS',
  borderBottom = true,
  sx = {}
}) {
  const institutionName = config?.institutionname || config?.name || config?.insname || '';
  const affiliatedBoard = config?.affiliatedboard || '';
  const address = config?.address || '';
  const phone = config?.phone || config?.contactusdetails || '';
  const email = config?.email || config?.contactemail || '';
  const logo = config?.logo || config?.logolink || '';

  return (
    <Box
      sx={{
        textAlign: 'center',
        mb: 2.5,
        pb: borderBottom ? 2 : 1,
        borderBottom: borderBottom ? '2px solid #0f172a' : 'none',
        ...sx
      }}
    >
      {logo && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Box
            component="img"
            src={logo}
            alt="Institution Logo"
            sx={{
              maxHeight: 75,
              maxWidth: 140,
              objectFit: 'contain'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </Box>
      )}

      {/* Very Large Prominent Institution Name */}
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 900,
          fontSize: { xs: '24px', sm: '30px', md: '34px' },
          color: '#0f172a',
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          lineHeight: 1.2,
          m: 0
        }}
      >
        {institutionName || 'INSTITUTION NAME'}
      </Typography>

      {/* Affiliated Board - directly following Institution Name */}
      {affiliatedBoard && (
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            fontSize: { xs: '14px', sm: '16px' },
            color: '#1e3a8a',
            mt: 0.5,
            letterSpacing: 0.5
          }}
        >
          {affiliatedBoard.startsWith('(') ? affiliatedBoard : `(${affiliatedBoard})`}
        </Typography>
      )}

      {/* Address & Contacts */}
      <Box sx={{ mt: 0.5, color: '#475569', fontSize: { xs: '12px', sm: '13px' }, fontWeight: 500 }}>
        {address && <span>{address}</span>}
        {phone && <span> &nbsp;|&nbsp; Ph: {phone}</span>}
        {email && (
          <span>
            {' '}
            &nbsp;|&nbsp; E-mail: <span style={{ color: '#1d4ed8' }}>{email}</span>
          </span>
        )}
      </Box>

      {/* Office Banner */}
      {officeTitle && (
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            mt: 1.5,
            color: '#0f172a',
            letterSpacing: 1,
            textTransform: 'uppercase'
          }}
        >
          {officeTitle}
        </Typography>
      )}

      {/* Specific Document Title */}
      {title && (
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            mt: 0.5,
            color: '#1e3a8a',
            textDecoration: 'underline',
            letterSpacing: 0.8,
            fontSize: { xs: '15px', sm: '17px' }
          }}
        >
          {title}
        </Typography>
      )}
    </Box>
  );
}
