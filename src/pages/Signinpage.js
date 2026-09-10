import React, { useState, useRef, useContext, useEffect }  from 'react';
import { TextField, Button, Grid, Typography, Box, IconButton, InputAdornment } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import ep1 from '../api/ep1';
import { configureCountryTerminology } from '../utils/countryTerminology';
import GoogleCredentialButton from '../components/GoogleCredentialButton';
import { continueAfterPrimaryLogin } from '../utils/twoFactorLogin';

const orthintelLogoUrl = "https://epaathsalagenai.s3.ap-southeast-2.amazonaws.com/orthintellogo.jpeg";

const Signup = () => {

    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const isOrthintelDomain = typeof window !== "undefined" && window.location.hostname.toLowerCase().includes("orthintel");

    useEffect(() => {
        if (isOrthintelDomain) configureCountryTerminology("USA");
    }, [isOrthintelDomain]);

    const searchapi = async (event) => {
        event?.preventDefault?.();
        //alert('checking ' + email + ' ' + password);

    const username=email;

        if(!username || !password) {
            alert('Please enter username and password');
            return;
        }
        try {
            const response = await ep1.get('/api/v1/loginapi', {
                params: {
                    email: username.toLowerCase(),
                    password: password

                }
            });
            //alert(response.data);
            console.log(response.data);
        
            if (response.data.status == "Success") {
                const statuslog=parseInt(response.data.statuslog);

                if(statuslog==0) {
                  alert('Access is not yet activated. Please click on welcome email from reminder@epaathsala.com');
                  return;
                }
                await continueAfterPrimaryLogin(response.data, navigate, { isOrthintelDomain });
            }
            else {
                alert(response.data?.message || 'Invalid Username or Password. Please try again.');
                //setTerm2('Invalid Username or Password. Please try again.');
            }
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Login failed. Please check backend connection and try again.');
        }
        
       
    };

    const handleGoogleLogin = async (credential) => {
      try {
        const response = await ep1.post('/api/v2/google-auth/login', { credential });
        await continueAfterPrimaryLogin(response.data, navigate, { isOrthintelDomain });
      } catch (err) {
        alert(err.response?.data?.message || err.message || 'Google login failed');
      }
    };

  return (
    <Box
      sx={{
        backgroundColor: "#1343c7",
        position: "relative",
        overflow: "hidden",
        marginX: "auto",
        maxWidth: "1500px",
        height:{xs:"100%" ,md: "100vh"}
      }}
    >
      {/* Background div behind the content */}
      <div
        style={{
          position: "absolute",
          maxWidth: "850px",
          width: "100%",
          height: "200vh",
          backgroundColor: "#9fadf0",
          right: "-170px",
          top: "-150px",
          rotate: "36deg",
          
        }}
        className='backgroundBox'
      />

      {/* Main content */}
      <Box
        sx={{
          height: "100vh",
          boxSizing: "border-box",
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'center',
          alignItems: "center",
          gap: { xs: "20px", sm: "30px", md: "150px" },
          marginX: "auto",
          color: "white",
          padding: { xs: "20px", sm: "30px" },
          backgroundColor: 'transparent',
          width: { xs: "100%", md: "90%" }
        }}
      >
        <Box sx={{ width: { xs: "90%", sm: "70%", md: "35%" }, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Box
            sx={{
              padding: { xs: 2, sm: 4 },
              boxShadow: 3,
              borderRadius: 2,
              bgcolor: 'background.paper',
              zIndex: 1,
              width: '100%',
            }}
          >
            <div style={{ alignItems: 'center', width: 300, marginLeft: 100}}>
             {isOrthintelDomain ? (
              <Box
                component="img"
                src={orthintelLogoUrl}
                alt="OrthIntel"
                sx={{
                  width: 170,
                  height: 70,
                  objectFit: "contain",
                  display: "block",
                  marginBottom: "30px"
                }}
              />
             ) : (
              <img
                src="https://campus.technology/images/logo.png"
                alt="ct_logo"
                width="150"
                height="60"
                style={{
                  objectFit: "cover",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  alignSelf: "center",
                  marginBottom: 30
                }}
              />
             )}
            </div>
            {/* <Typography variant="h4" align="center" gutterBottom color='black'>
              Login
            </Typography> */}
            <form>
              <Grid container spacing={2}>
                {/* <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    variant="outlined"
                    required
                    size="small"
                  />
                </Grid> */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    variant="outlined"
                    type="email"
                    size="small"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Password"
                    variant="outlined"
                    type={showPassword ? "text" : "password"}
                    size="small"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowPassword((prev) => !prev)}
                            onMouseDown={(event) => event.preventDefault()}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                {/* <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    variant="outlined"
                    type="password"
                    size="small"
                    required
                  />
                </Grid> */}
                <Grid item xs={12}>
                  <Button
                   
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ padding: 1.5 }}
                    onClick={searchapi}
                  >
                    Login
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <GoogleCredentialButton onCredential={handleGoogleLogin} text="Login with Google" />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body1" align="center" color='black' sx={{ mt: 2, mb: 1 }}>
                    Don't have an account? <a href="/signuppage">Sign up</a>
                  </Typography>
                  <Typography variant="body1" align="center" color='black' sx={{ mt: 2, mb: 1 }}>
                    <a href="/forgotpassword">Forgot password</a>
                  </Typography>
                </Grid>
                {/* <Grid item xs={12}>
                  <Typography variant="body1" align="center" color='black' sx={{ mt: 2, mb: 1 }}>
                    Or sign up with
                  </Typography>
                </Grid>
                <Grid item xs={4} />
                <Grid item xs={2}>
                  <a href='#' sx={{ mb: 1 }}>
                    <GoogleIcon />
                  </a>
                </Grid>
           
                <Grid item xs={2}>
                  <a href='#' sx={{ mb: 1 }}>
                    <FacebookIcon />
                  </a>
                </Grid> */}
                <Grid item xs={4} />
              </Grid>
            </form>
          </Box>
        </Box>
        <Box sx={{ 
          width: { xs: "90%", sm: "70%", md: "45%" }, 
          zIndex: 1, 
          textAlign: { xs: "center", md: "right" }, 
          padding: { xs: 2, md: 0 } 
        }}>
          <Typography variant='h2' fontWeight="bold" fontSize={{ xs: '1.5rem', sm: '2.5rem', md: '3rem' }} textTransform="uppercase" display={{xs:"none",md:"block"}}>
            AI enabled ERP, LMS and Accreditation Management Software
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Signup;
