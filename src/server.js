import express from 'express';
import dotenv from 'dotenv';  
import authRoute from './routes/authRoute.js'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());

//public routes
app.use('/api/auth', authRoute)

//private routes


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}: http://localhost:${PORT}`);
})
