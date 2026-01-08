/**
 * Database Seeder - Initial Data Setup
 * Run: npx ts-node scripts/seed.ts
 */

import * as admin from 'firebase-admin';
import { logger } from '../src/utils/logger';

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.firestore();

/**
 * Seed subscription plans
 */
async function seedSubscriptionPlans() {
    const plans = [
        {
            id: 'basic_seller',
            name: 'Basic Seller Plan',
            type: 'seller',
            price: 499,
            currency: 'INR',
            duration: 30, // days
            features: {
                maxListings: 3,
                featuredListings: 0,
                analytics: false,
                prioritySupport: false,
                verifiedBadge: false,
            },
            isActive: true,
        },
        {
            id: 'premium_seller',
            name: 'Premium Seller Plan',
            type: 'seller',
            price: 1499,
            currency: 'INR',
            duration: 90,
            features: {
                maxListings: 10,
                featuredListings: 2,
                analytics: true,
                prioritySupport: false,
                verifiedBadge: true,
            },
            isActive: true,
            popular: true,
        },
        {
            id: 'pro_seller',
            name: 'Pro Seller Plan',
            type: 'seller',
            price: 4999,
            currency: 'INR',
            duration: 180,
            features: {
                maxListings: -1, // unlimited
                featuredListings: 5,
                analytics: true,
                prioritySupport: true,
                verifiedBadge: true,
                dedicatedManager: true,
            },
            isActive: true,
        },
        {
            id: 'agent_basic',
            name: 'Agent Basic',
            type: 'agent',
            price: 999,
            currency: 'INR',
            duration: 30,
            features: {
                maxListings: 20,
                leadCredits: 50,
                analytics: true,
            },
            isActive: true,
        },
        {
            id: 'agent_pro',
            name: 'Agent Pro',
            type: 'agent',
            price: 4999,
            currency: 'INR',
            duration: 90,
            features: {
                maxListings: 100,
                leadCredits: 200,
                analytics: true,
                prioritySupport: true,
            },
            isActive: true,
        },
    ];

    const batch = db.batch();
    for (const plan of plans) {
        const ref = db.collection('subscriptionPlans').doc(plan.id);
        batch.set(ref, { ...plan, createdAt: new Date().toISOString() });
    }
    await batch.commit();
    logger.info(`Seeded ${plans.length} subscription plans`);
}

/**
 * Seed system configuration
 */
async function seedSystemConfig() {
    const configs = [
        {
            id: 'platform',
            commissionPercent: 2.5,
            partnerCommissionPercent: 1.0,
            maxFreeListingsPerMonth: 1,
            maintenanceMode: false,
            minListingPrice: 10000,
            maxListingPrice: 1000000000,
        },
        {
            id: 'notifications',
            emailEnabled: true,
            smsEnabled: true,
            pushEnabled: true,
        },
        {
            id: 'features',
            biddingEnabled: true,
            auctionEnabled: false,
            partnersEnabled: true,
            premiumListingsEnabled: true,
        },
    ];

    const batch = db.batch();
    for (const config of configs) {
        const ref = db.collection('config').doc(config.id);
        batch.set(ref, { ...config, updatedAt: new Date().toISOString() });
    }
    await batch.commit();
    logger.info(`Seeded ${configs.length} system configurations`);
}

/**
 * Seed property types & amenities
 */
async function seedMasterData() {
    const propertyTypes = [
        { id: 'apartment', name: 'Apartment', icon: '🏢' },
        { id: 'house', name: 'Independent House', icon: '🏠' },
        { id: 'villa', name: 'Villa', icon: '🏡' },
        { id: 'plot', name: 'Plot', icon: '📐' },
        { id: 'commercial', name: 'Commercial', icon: '🏪' },
        { id: 'office', name: 'Office Space', icon: '🏛️' },
        { id: 'pg', name: 'PG/Hostel', icon: '🛏️' },
    ];

    const amenities = [
        { id: 'parking', name: 'Parking', icon: '🚗', category: 'basic' },
        { id: 'lift', name: 'Lift/Elevator', icon: '🛗', category: 'basic' },
        { id: 'power_backup', name: 'Power Backup', icon: '🔋', category: 'basic' },
        { id: 'security', name: '24x7 Security', icon: '👮', category: 'safety' },
        { id: 'cctv', name: 'CCTV', icon: '📹', category: 'safety' },
        { id: 'gym', name: 'Gym', icon: '🏋️', category: 'fitness' },
        { id: 'pool', name: 'Swimming Pool', icon: '🏊', category: 'fitness' },
        { id: 'garden', name: 'Garden', icon: '🌳', category: 'outdoor' },
        { id: 'clubhouse', name: 'Club House', icon: '🏛️', category: 'community' },
        { id: 'playground', name: 'Playground', icon: '🎢', category: 'community' },
        { id: 'wifi', name: 'WiFi', icon: '📶', category: 'tech' },
        { id: 'intercom', name: 'Intercom', icon: '📞', category: 'tech' },
        { id: 'water_supply', name: '24x7 Water', icon: '💧', category: 'basic' },
        { id: 'gas_pipeline', name: 'Gas Pipeline', icon: '🔥', category: 'basic' },
        { id: 'rain_water', name: 'Rain Water Harvesting', icon: '🌧️', category: 'eco' },
        { id: 'solar', name: 'Solar Panels', icon: '☀️', category: 'eco' },
    ];

    const cities = [
        { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', tier: 1 },
        { id: 'delhi', name: 'Delhi', state: 'Delhi', tier: 1 },
        { id: 'bangalore', name: 'Bangalore', state: 'Karnataka', tier: 1 },
        { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', tier: 1 },
        { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', tier: 1 },
        { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', tier: 1 },
        { id: 'pune', name: 'Pune', state: 'Maharashtra', tier: 1 },
        { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', tier: 1 },
        { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', tier: 2 },
        { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', tier: 2 },
        { id: 'chandigarh', name: 'Chandigarh', state: 'Chandigarh', tier: 2 },
        { id: 'gurgaon', name: 'Gurgaon', state: 'Haryana', tier: 1 },
        { id: 'noida', name: 'Noida', state: 'Uttar Pradesh', tier: 1 },
    ];

    const batch = db.batch();

    for (const type of propertyTypes) {
        const ref = db.collection('masterData').doc(`propertyType_${type.id}`);
        batch.set(ref, { ...type, collection: 'propertyTypes' });
    }

    for (const amenity of amenities) {
        const ref = db.collection('masterData').doc(`amenity_${amenity.id}`);
        batch.set(ref, { ...amenity, collection: 'amenities' });
    }

    for (const city of cities) {
        const ref = db.collection('masterData').doc(`city_${city.id}`);
        batch.set(ref, { ...city, collection: 'cities' });
    }

    await batch.commit();
    logger.info(`Seeded ${propertyTypes.length} property types, ${amenities.length} amenities, ${cities.length} cities`);
}

/**
 * Create admin user
 */
async function createAdminUser() {
    const adminEmail = 'admin@gharbazaar.in';

    try {
        // Check if user exists
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(adminEmail);
        } catch {
            // Create new user
            userRecord = await admin.auth().createUser({
                email: adminEmail,
                password: 'Admin@123!', // Change in production!
                displayName: 'GharBazaar Admin',
                emailVerified: true,
            });
        }

        // Set custom claims
        await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });

        // Create/update user document
        await db.collection('users').doc(userRecord.uid).set({
            email: adminEmail,
            displayName: 'GharBazaar Admin',
            role: 'admin',
            emailVerified: true,
            isActive: true,
            createdAt: new Date().toISOString(),
        }, { merge: true });

        logger.info(`Admin user created/updated: ${adminEmail}`);
    } catch (error) {
        logger.error('Error creating admin user:', error);
    }
}

/**
 * Main seeder function
 */
async function runSeeders() {
    logger.info('🌱 Starting database seeding...');

    try {
        await seedSubscriptionPlans();
        await seedSystemConfig();
        await seedMasterData();
        await createAdminUser();

        logger.info('✅ Database seeding completed successfully!');
    } catch (error) {
        logger.error('❌ Database seeding failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run seeders
runSeeders();
