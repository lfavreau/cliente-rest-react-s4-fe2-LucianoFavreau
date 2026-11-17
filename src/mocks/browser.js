import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

//registra handlers en el msw
export const worker = setupWorker(...handlers);
