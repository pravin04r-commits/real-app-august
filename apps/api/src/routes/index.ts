import { Router } from 'express';
import { aiRouter } from './ai.js';
import { coupleRouter } from './couple.js';
import { daresRouter } from './dares.js';
import { journalRouter } from './journal.js';
import { meRouter } from './me.js';
import { memoriesRouter } from './memories.js';
import { milestonesRouter } from './milestones.js';
import { missionsRouter } from './missions.js';
import { publicRouter } from './public.js';
import { quizRouter } from './quiz.js';
import { sparksRouter } from './sparks.js';

export const api = Router();

api.use('/me', meRouter);
api.use('/couple', coupleRouter);
api.use('/journal', journalRouter);
api.use('/sparks', sparksRouter);
api.use('/dares', daresRouter);
api.use('/missions', missionsRouter);
api.use('/milestones', milestonesRouter);
api.use('/memories', memoriesRouter);
api.use('/quiz', quizRouter);
api.use('/ai', aiRouter);
api.use('/public', publicRouter);
