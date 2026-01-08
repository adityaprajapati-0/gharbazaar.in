import * as admin from 'firebase-admin';
import { config } from './index';
import { logger } from '../utils/logger';

let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (): admin.app.App => {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: config.firebase.projectId,
                privateKey: config.firebase.privateKey,
                clientEmail: config.firebase.clientEmail,
            }),
            projectId: config.firebase.projectId,
        });

        logger.info('✅ Firebase Admin SDK initialized successfully');
        return firebaseApp;
    } catch (error) {
        logger.error('❌ Firebase initialization failed:', error);
        throw error;
    }
};

export const getFirebaseApp = (): admin.app.App => {
    if (!firebaseApp) {
        throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }
    return firebaseApp;
};

export const getAuth = (): admin.auth.Auth => {
    return getFirebaseApp().auth();
};

export const getFirestore = (): admin.firestore.Firestore => {
    return getFirebaseApp().firestore();
};

export const getStorage = (): admin.storage.Storage => {
    return getFirebaseApp().storage();
};

export { admin };
