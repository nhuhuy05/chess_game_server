import express from 'express';
import dotenv from 'dotenv';  
import authRoute from './routes/authRoute.js'
import gameRoute from './routes/gameRoute.js'
import userRoute from './routes/userRoute.js';
import { protectedRoute } from './middlewares/authMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());

//public routes
app.use('/api/auth', authRoute)

//private routes (cần JWT)
app.use(protectedRoute);
app.use('/api/matchmaking', gameRoute)
app.use('/api/users', userRoute)


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}: http://localhost:${PORT}`);
})
