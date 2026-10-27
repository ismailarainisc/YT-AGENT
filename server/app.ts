import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRouter from './api.ts';

export const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount /api routes
app.use('/api', apiRouter);
