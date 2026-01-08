import { getFirestore } from '../config/firebase';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface ChatContext {
    userId: string;
    userRole: 'buyer' | 'seller' | 'admin';
    currentPage?: string;
    propertyId?: string;
    conversationHistory: ChatMessage[];
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

export interface PropertySearchFilters {
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
}

export class AIChatbotService {
    private db = getFirestore();

    /**
     * Ask a question to the AI with full context
     * Uses intelligent pattern matching - NO EXTERNAL API NEEDED!
     */
    async askQuestion(question: string, context: ChatContext): Promise<string> {
        try {
            const lowerQuestion = question.toLowerCase();

            // Get property context if available
            let propertyData = null;
            if (context.propertyId) {
                propertyData = await this.getPropertyData(context.propertyId);
            }

            // Check for property search intent
            const searchResult = await this.handlePropertySearch(question);

            // Generate intelligent response based on question type
            let response = '';

            // Property search queries
            if (lowerQuestion.includes('search') || lowerQuestion.includes('find') || lowerQuestion.includes('show') || lowerQuestion.includes('looking for')) {
                if (searchResult && searchResult.properties && searchResult.properties.length > 0) {
                    response = this.formatPropertySearchResults(searchResult);
                } else if (context.userRole === 'buyer') {
                    response = this.getBuyerSearchGuidance();
                } else {
                    response = this.getSellerVisibilityTips();
                }
            }
            // Pricing questions
            else if (lowerQuestion.includes('price') || lowerQuestion.includes('cost') || lowerQuestion.includes('payment') || lowerQuestion.includes('pay')) {
                response = context.userRole === 'buyer'
                    ? this.getBuyerPricingInfo()
                    : this.getSellerPricingStrategy();
            }
            // Visit/booking questions
            else if (lowerQuestion.includes('visit') || lowerQuestion.includes('schedule') || lowerQuestion.includes('view') || lowerQuestion.includes('see')) {
                response = context.userRole === 'buyer'
                    ? this.getBuyerVisitInfo()
                    : this.getSellerVisitManagement();
            }
            // Documentation questions
            else if (lowerQuestion.includes('document') || lowerQuestion.includes('paper') || lowerQuestion.includes('legal')) {
                response = this.getDocumentationInfo(context.userRole);
            }
            // Visibility/inquiries (seller specific)
            else if (lowerQuestion.includes('visibility') || lowerQuestion.includes('inquiry') || lowerQuestion.includes('inquiries') || lowerQuestion.includes('views')) {
                response = this.getSellerVisibilityTips();
            }
            // Analytics/performance (seller specific)
            else if (lowerQuestion.includes('analytic') || lowerQuestion.includes('performance') || lowerQuestion.includes('stat')) {
                response = this.getAnalyticsInfo();
            }
            // Offer/proposal questions
            else if (lowerQuestion.includes('offer') || lowerQuestion.includes('proposal') || lowerQuestion.includes('bid')) {
                response = context.userRole === 'buyer'
                    ? this.getBuyerOfferInfo()
                    : this.getSellerOfferInfo();
            }
            // Property-specific questions
            else if (propertyData && !propertyData.error) {
                response = this.getPropertySpecificInfo(propertyData, question);
            }
            // Greeting
            else if (lowerQuestion.includes('hello') || lowerQuestion.includes('hi') || lowerQuestion.includes('hey')) {
                response = this.getGreeting(context.userRole);
            }
            // Help/general
            else if (lowerQuestion.includes('help') || lowerQuestion.includes('what can you') || lowerQuestion.includes('how do')) {
                response = this.getGeneralHelp(context.userRole);
            }
            // Default response
            else {
                response = this.getContextualResponse(question, context.userRole, context.currentPage);
            }

            // Save conversation
            await this.saveConversationMessage(context.userId, question, response);

            return response;
        } catch (error: any) {
            logger.error('AI chatbot error:', error);
            throw new AppError(500, 'Failed to get AI response');
        }
    }

    private formatPropertySearchResults(searchResult: any): string {
        const { properties, count } = searchResult;

        if (count === 0) {
            return "I couldn't find any properties matching your exact criteria. Try:\n\n• Expanding your price range\n• Considering nearby locations\n• Being flexible with property type\n• Adjusting bedroom/bathroom requirements\n\nWould you like me to help refine your search?";
        }

        let response = `Great news! I found **${count} propert${count > 1 ? 'ies' : 'y'}** matching your search:\n\n`;

        properties.slice(0, 3).forEach((prop: any, index: number) => {
            const price = prop.price ? `₹${(prop.price / 100000).toFixed(1)} Lakh` : 'Price on request';
            response += `${index + 1}. **${prop.title || 'Property'}**\n`;
            response += `   📍 ${prop.location?.city || 'Location not specified'}\n`;
            response += `   💰 ${price}\n`;
            response += `   🛏️ ${prop.bedrooms || 'N/A'} BHK | 🛁 ${prop.bathrooms || 'N/A'} Bath\n`;
            response += `   📐 ${prop.area || 'N/A'} sq.ft\n\n`;
        });

        if (count > 3) {
            response += `_...and ${count - 3} more properties_\n\n`;
        }

        response += "Visit the **Browse Properties** page to see full details, photos, and schedule visits!";

        return response;
    }

    private getBuyerSearchGuidance(): string {
        return `**Finding Your Perfect Property:**\n\n✅ **Use Advanced Filters:**\n• Location (city/area)\n• Price range\n• Property type (apartment/villa/house)\n• Bedrooms & bathrooms\n• Amenities\n\n✅ **Pro Tips:**\n1. Save interesting properties to Favorites\n2. Set up search alerts for new listings\n3. Compare multiple properties side-by-side\n4. Check neighborhood ratings\n5. Read reviews from previous buyers\n\n💡 Try asking: "Show me 2BHK apartments in Mumbai under 50 lakhs"`;
    }

    private getSellerVisibilityTips(): string {
        return `**Boost Your Listing Visibility:**\n\n🚀 **Proven Strategies:**\n\n1. **High-Quality Photos** (5+ images)\n   • Well-lit, wide-angle shots\n   • Show all rooms\n   • Highlight unique features\n\n2. **Detailed Description**\n   • 200+ words\n   • Mention nearby amenities\n   • Include recent renovations\n\n3. **Competitive Pricing**\n   • Research similar properties\n   • Price 5-10% below market for quick sale\n\n4. **Quick Responses**\n   • Reply to inquiries within 2 hours\n   • Keep contact info updated\n\n5. **Complete Information**\n   • Fill all fields\n   • Add floor plans if available\n   • Mention parking, facing direction\n\n📊 Properties following these tips get **3x more inquiries**!`;
    }

    private getBuyerPricingInfo(): string {
        return `**Understanding Pricing on GharBazaar:**\n\n💰 **How It Works:**\n• Browse all properties **FREE**\n• View seller contact info **FREE**\n• Schedule visits **FREE**\n• Make offers **FREE**\n\n✅ **Price Transparency:**\n• All prices shown upfront\n• No hidden fees or commissions\n• Compare prices easily\n• Negotiate directly with sellers\n\n🔒 **Secure Payments:**\n• Escrow protection available\n• Multiple payment options\n• Transaction tracking\n• Receipt generation\n\n💡 **Smart Buying:**\n1. Compare 3-5 similar properties\n2. Check price history in the area\n3. Consider future development\n4. Factor in renovation costs\n5. Don't hesitate to negotiate!`;
    }

    private getSellerPricingStrategy(): string {
        return `**Smart Pricing Strategy:**\n\n📊 **Research-Based Pricing:**\n\n1. **Market Analysis**\n   • Check 10 similar properties in your area\n   • Note their age, condition, amenities\n   • See average time on market\n\n2. **Price Factors**\n   • Location & neighborhood\n   • Property age & condition\n   • Nearby amenities (metro, schools, malls)\n   • Unique features (balcony, parking, view)\n   • Market demand (season matters!)\n\n3. **Pricing Tactics**\n   • Price ₹1-2 lakh below round numbers (₹49L vs ₹50L)\n   • Leave 10% room for negotiation\n   • Update after 2 weeks if no inquiries\n\n4. **Analytics Insights**\n   • Check your views vs. inquiries ratio\n   • Monitor competitor pricing\n   • Track seasonal trends\n\n💡 **Pro Tip:** Properties priced competitively sell **40% faster**!`;
    }

    private getBuyerVisitInfo(): string {
        return `**Scheduling Property Visits:**\n\n📅 **How to Schedule:**\n\n1. Click **"Schedule Visit"** on any property\n2. Choose your preferred date & time\n3. Seller gets instant notification\n4. Confirmation within 24 hours\n5. Get directions & seller contact\n\n✅ **Visit Preparation:**\n• Bring government-issued ID\n• Note questions beforehand\n• Check neighborhood at different times\n• Bring measuring tape if needed\n• Take photos/videos (with permission)\n\n🎯 **What to Check:**\n• Water pressure & availability\n• Electrical wiring condition\n• Wall dampness/cracks\n• Natural light & ventilation\n• Noise levels\n• Parking accessibility\n• Security arrangements\n\n💡 **Schedule multiple properties** on the same day to save time!`;
    }

    private getSellerVisitManagement(): string {
        return `**Managing Visit Requests:**\n\n📨 **Handling Requests:**\n\n1. Check "Inquiries" in your dashboard\n2. Review buyer visit requests\n3. Confirm or suggest alternative times\n4. Prepare property before visit\n\n✅ **Visit Success Tips:**\n\n**Before Visit:**\n• Clean & declutter thoroughly\n• Fix minor issues (leaky taps, etc.)\n• Remove personal items\n• Ensure good lighting\n• Have documents ready\n\n**During Visit:**\n• Be welcoming & honest\n• Highlight unique features\n• Answer questions clearly\n• Don't pressure buyers\n• Take note of their feedback\n\n**After Visit:**\n• Follow up within 24 hours\n• Ask for feedback\n• Be ready to negotiate\n\n⏱️ **Quick Response = Higher Sale Chance**\nReplying within 2 hours increases conversion by 60%!`;
    }

    private getDocumentationInfo(role: string): string {
        if (role === 'buyer') {
            return `**Documents Needed for Buying:**\n\n📄 **Essential Documents:**\n\n**For Verification:**\n• Government-issued ID (Aadhaar/PAN)\n• Address proof\n• Income proof (salary slips/ITR)\n• Bank statements (6 months)\n\n**For Loan Application:**\n• Employment proof\n• Credit score report\n• Property valuation report\n• Sanction letter from bank\n\n**For Registration:**\n• Sale agreement\n• NOC from society\n• Property tax receipts\n• Encumbrance certificate\n• Occupancy certificate\n\n💡 **GharBazaar Helps:**\n• Document checklist provided\n• Legal partner assistance available\n• Verification services\n• Secure document storage\n\n🔒 All your documents are **fully encrypted** on our platform!`;
        } else {
            return `**Documents to Keep Ready (Sellers):**\n\n📋 **Must-Have Documents:**\n\n**Property Documents:**\n• Original sale deed\n• Property tax receipts (updated)\n• Society NOC/maintenance receipts\n• Occupancy certificate\n• Approved building plan\n• Encumbrance certificate\n\n**Ownership Proof:**\n• Title deed\n• Mutation records\n• Chain of ownership documents\n• Will/succession certificate (if inherited)\n\n**Clearances:**\n• No-dues certificate from society\n• Utility bills (current)\n• Property tax clearance\n\n✅ **Why It Matters:**\nHaving documents ready:\n• Builds buyer trust\n• Speeds up sale process\n• Prevents legal issues\n• Increases property value\n\n💡 Our **legal partners** can help verify all documents!`;
        }
    }

    private getAnalyticsInfo(): string {
        return `**Understanding Your Analytics:**\n\n📊 **Key Metrics Explained:**\n\n**1. Views** 👀\n• Total visits to your listing\n• Track daily/weekly trends\n• Compare with similar properties\n\n**2. Inquiries** 💬\n• Direct contact requests\n• Visit scheduling requests\n• Questions asked\n\n**3. Conversion Rate** 📈\n• Views → Inquiries ratio\n• Industry average: 3-5%\n• Yours should be >5% for good listing\n\n**4. Response Time** ⏱️\n• Your average reply time\n• Target: Under 2 hours\n• Faster = higher conversion\n\n**5. Competitor Analysis** 🔍\n• Similar properties' performance\n• Pricing comparison\n• Feature benchmarking\n\n✅ **Improving Metrics:**\n• Low views? → Improve photos/title\n• Low inquiries? → Adjust pricing\n• Low conversion? → Better description\n\n💡 Check analytics **weekly** to optimize your listing!`;
    }

    private getBuyerOfferInfo(): string {
        return `**Making Smart Offers:**\n\n💰 **Offer Strategy:**\n\n**1. Research First**\n• Check recent sales in area\n• Compare similar properties\n• Consider market conditions\n• Note time on market\n\n**2. Calculate Your Offer**\n• Start 10-15% below asking price\n• Leave room for negotiation\n• Consider renovation costs\n• Factor in amenities value\n\n**3. Making Offer**\n• Go to property page\n• Click "Make Offer"\n• Enter your price & terms\n• Add personal message to seller\n• Submit with validity period\n\n**4. Negotiation Tips**\n• Be respectful but firm\n• Justify your price with facts\n• Stay within your budget\n• Don't show desperation\n• Be ready to walk away\n\n✅ **What Sellers Value:**\n• Quick closing timeline\n• Flexible on possession date\n• Pre-approved loan\n• Minimal contingencies\n\n📝 All offers are **confidential** and tracked in your dashboard!`;
    }

    private getSellerOfferInfo(): string {
        return `**Handling Buyer Offers:**\n\n💼 **Offer Management:**\n\n**1. Review Offers**\n• Check "Offer Letters" in dashboard\n• See buyer's offer price\n• Review terms & conditions\n• Check buyer verification status\n\n**2. Evaluation Criteria**\n• Offer price vs. your asking price\n• Buyer's financial capability\n• Closing timeline\n• Contingencies mentioned\n• Earnestness of buyer\n\n**3. Response Options**\n• **Accept** - Close the deal\n• **Counter-Offer** - Suggest different terms\n• **Decline** - Politely reject\n\n**4. Negotiation Tips**\n• Don't accept first offer immediately\n• Counter with facts (comps, improvements)\n• Be realistic about market value\n• Consider all terms, not just price\n• Keep communication professional\n\n✅ **Red Flags:**\n• Offers way below market (>25% less)\n• Too many contingencies\n• Unclear financing\n• Pressure tactics\n\n💡 **Good Offers:** Typically 5-10% below asking, serious buyers, clean terms!`;
    }

    private getPropertySpecificInfo(property: any, question: string): string {
        const price = property.price ? `₹${(property.price / 100000).toFixed(1)} Lakh` : 'Price available on request';

        return `**About This Property:**\n\n${property.title || 'Property Details'}\n\n📍 **Location:** ${property.location?.city || 'N/A'}, ${property.location?.area || ''}\n💰 **Price:** ${price}\n🏠 **Type:** ${property.type || 'N/A'}\n🛏️ **Bedrooms:** ${property.features?.bedrooms || 'N/A'}\n🛁 **Bathrooms:** ${property.features?.bathrooms || 'N/A'}\n📐 **Area:** ${property.features?.area || 'N/A'} sq.ft\n\n✨ **Key Features:**\n${property.amenities ? property.amenities.slice(0, 5).map((a: string) => `• ${a}`).join('\n') : '• Check full listing for amenities'}\n\n${property.description ? `**Description:**\n${property.description.substring(0, 200)}...` : ''}\n\n💡 **Interested?** Click "Schedule Visit" to see this property in person!`;
    }

    private getGreeting(role: string): string {
        return role === 'buyer'
            ? `👋 Hello! I'm your GharBazaar AI assistant for buyers.\n\nI can help you:\n• Find perfect properties\n• Understand pricing\n• Schedule visits\n• Make smart offers\n• Navigate the buying process\n\n**What would you like to know?**`
            : `👋 Hello! I'm your GharBazaar AI assistant for sellers.\n\nI can help you:\n• Optimize your listings\n• Price competitively\n• Get more inquiries\n• Manage leads effectively\n• Understand analytics\n\n**How can I assist you today?**`;
    }

    private getGeneralHelp(role: string): string {
        return role === 'buyer'
            ? `**I Can Help You With:**\n\n🔍 **Property Search**\n• Finding properties\n• Using filters effectively\n• Comparing options\n\n💰 **Pricing & Payments**\n• Understanding costs\n• Making offers\n• Payment security\n\n📅 **Scheduling**\n• Booking property visits\n• Meeting sellers\n• Visit preparation\n\n📄 **Documentation**\n• Required documents\n• Legal process\n• Verification\n\n💡 **Ask me anything!** For example:\n• "Show me 3BHK apartments in Mumbai"\n• "How do I schedule a visit?"\n• "What documents do I need?"`
            : `**I Can Help You With:**\n\n📈 **Listing Optimization**\n• Improving visibility\n• Better descriptions\n• Photo tips\n\n💰 **Pricing Strategy**\n• Market analysis\n• Competitive pricing\n• Negotiation tips\n\n💬 **Lead Management**\n• Handling inquiries\n• Visit scheduling\n• Offer evaluation\n\n📊 **Analytics**\n• Performance metrics\n• Improvement suggestions\n• Competitor analysis\n\n💡 **Ask me anything!** For example:\n• "How do I get more inquiries?"\n• "What should I price my 2BHK at?"\n• "How do I improve my listing?"`;
    }

    private getContextualResponse(question: string, role: string, page?: string): string {
        // Try to give a helpful response based on context
        if (page?.includes('browse')) {
            return `You're on the Browse Properties page. ${role === 'buyer' ? 'Use the filters to narrow down your search, save favorites, and schedule visits for properties you like!' : 'Check out how other properties are listed to improve your own listing!'}`;
        } else if (page?.includes('analytic')) {
            return this.getAnalyticsInfo();
        } else if (page?.includes('message') || page?.includes('messages')) {
            return `**Using Messages:**\n\n💬 You can:\n• Chat directly with ${role === 'buyer' ? 'sellers' : 'buyers'}\n• Share property details\n• Coordinate visits\n• Negotiate offers\n• Ask questions\n\n💡 **Tip:** Keep conversations professional and prompt responses lead to better deals!`;
        }

        return `I'm here to help! ${role === 'buyer'
            ? 'Try asking about finding properties, pricing, scheduling visits, or making offers.'
            : 'Try asking about improving listings, pricing strategy, getting inquiries, or analytics.'}\n\nOr click one of the quick action buttons below!`;
    }

    /**
     * Handle property search from natural language
     */
    private async handlePropertySearch(question: string): Promise<any> {
        const lowerQuestion = question.toLowerCase();

        // Only search if question seems search-related
        if (!lowerQuestion.includes('show') && !lowerQuestion.includes('find') &&
            !lowerQuestion.includes('search') && !lowerQuestion.includes('looking')) {
            return null;
        }

        const filters: any = {};

        // Location detection
        const cities = ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'kolkata', 'pune', 'ahmedabad', 'jaipur', 'surat', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot'];
        for (const city of cities) {
            if (lowerQuestion.includes(city)) {
                filters.location = city.charAt(0).toUpperCase() + city.slice(1);
                if (city === 'bengaluru') filters.location = 'Bangalore';
                break;
            }
        }

        // Property type detection
        if (lowerQuestion.includes('apartment') || lowerQuestion.includes('flat')) {
            filters.propertyType = 'apartment';
        } else if (lowerQuestion.includes('villa') || lowerQuestion.includes('bungalow')) {
            filters.propertyType = 'villa';
        } else if (lowerQuestion.includes('house')) {
            filters.propertyType = 'house';
        } else if (lowerQuestion.includes('plot')) {
            filters.propertyType = 'plot';
        }

        // Bedroom detection
        const bedroomMatch = lowerQuestion.match(/(\d+)\s*(?:bhk|bedroom|bed|br)/i);
        if (bedroomMatch) {
            filters.bedrooms = parseInt(bedroomMatch[1]);
        }

        // Price detection (in lakhs/crores)
        const lakhMatch = lowerQuestion.match(/(?:under|below|less than|upto|up to)\s*(\d+)\s*(?:lakh|lac|L)/i);
        const croreMatch = lowerQuestion.match(/(?:under|below|less than|upto|up to)\s*(\d+)\s*(?:crore|cr)/i);
        if (lakhMatch) {
            filters.maxPrice = parseInt(lakhMatch[1]) * 100000;
        } else if (croreMatch) {
            filters.maxPrice = parseInt(croreMatch[1]) * 10000000;
        }

        // If we detected any filters, search
        if (Object.keys(filters).length > 0) {
            return await this.searchProperties(filters);
        }

        return null;
    }

    /**
     * Search properties based on filters
     */
    private async searchProperties(filters: PropertySearchFilters): Promise<any> {
        try {
            let query = this.db.collection('properties')
                .where('status', '==', 'approved')
                .limit(5);

            if (filters.location) {
                query = query.where('location.city', '==', filters.location);
            }

            if (filters.propertyType) {
                query = query.where('type', '==', filters.propertyType);
            }

            if (filters.bedrooms) {
                query = query.where('features.bedrooms', '==', filters.bedrooms);
            }

            const snapshot = await query.get();

            const properties = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    price: data.price,
                    location: data.location,
                    type: data.type,
                    bedrooms: data.features?.bedrooms,
                    bathrooms: data.features?.bathrooms,
                    area: data.features?.area,
                };
            });

            // Filter by price if specified
            const filtered = properties.filter(p => {
                if (filters.minPrice && p.price < filters.minPrice) return false;
                if (filters.maxPrice && p.price > filters.maxPrice) return false;
                return true;
            });

            return {
                count: filtered.length,
                properties: filtered,
            };
        } catch (error) {
            logger.error('Property search error:', error);
            return null;
        }
    }

    /**
     * Get property data for context
     */
    private async getPropertyData(propertyId: string): Promise<any> {
        try {
            const doc = await this.db.collection('properties').doc(propertyId).get();
            if (!doc.exists) {
                return { error: 'Property not found' };
            }

            const data = doc.data();
            return {
                id: doc.id,
                title: data?.title,
                description: data?.description,
                price: data?.price,
                location: data?.location,
                type: data?.type,
                features: data?.features,
                amenities: data?.amenities,
            };
        } catch (error) {
            logger.error('Property fetch error:', error);
            return { error: 'Failed to fetch property' };
        }
    }

    /**
     * Detect if escalation to human agent is needed
     */
    detectEscalation(conversation: ChatMessage[]): boolean {
        const lastMessages = conversation.slice(-3).map(m => m.content.toLowerCase());

        const escalationKeywords = [
            'speak to agent',
            'human help',
            'talk to person',
            'customer support',
            'complaint',
            'urgent',
            'legal issue',
            'payment problem',
            'refund',
            'not working',
            'not satisfied',
            'escalate',
        ];

        return lastMessages.some(msg =>
            escalationKeywords.some(keyword => msg.includes(keyword))
        );
    }

    /**
     * Save conversation message to history
     */
    private async saveConversationMessage(
        userId: string,
        question: string,
        answer: string
    ): Promise<void> {
        try {
            await this.db.collection('chatbot_conversations').add({
                userId,
                messages: [
                    { role: 'user', content: question, timestamp: new Date().toISOString() },
                    { role: 'assistant', content: answer, timestamp: new Date().toISOString() },
                ],
                createdAt: new Date().toISOString(),
            });
        } catch (error) {
            logger.error('Failed to save conversation:', error);
        }
    }

    /**
     * Get conversation history for user
     */
    async getConversationHistory(userId: string, limit = 10): Promise<ChatMessage[]> {
        try {
            const snapshot = await this.db
                .collection('chatbot_conversations')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const messages: ChatMessage[] = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.messages) {
                    messages.push(...data.messages);
                }
            });

            return messages.reverse();
        } catch (error) {
            logger.error('Failed to fetch conversation history:', error);
            return [];
        }
    }
}

export const aiChatbotService = new AIChatbotService();
