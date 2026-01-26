import 'dotenv/config';
import { RecommendationService } from './services/recommendation';

async function main() {
    console.log("Testing RecommendationService...");

    // Mock context
    const context = [
        { title: "Blinding Lights", artist: "The Weeknd" },
        { title: "Stay", artist: "The Kid LAROI & Justin Bieber" }
    ];

    try {
        console.log("Fetching recommendations (Source: YouTube)...");
        const recommendations = await RecommendationService.getRecommendations(
            context,
            'youtube',
            undefined,
            "upbeat pop"
        );

        console.log("\n--- Result ---");
        console.log(JSON.stringify(recommendations, null, 2));

        if (recommendations.length > 0) {
            console.log(`\n✅ Successfully received ${recommendations.length} recommendations.`);
        } else {
            console.log("\n⚠️ Received 0 recommendations.");
        }

    } catch (error) {
        console.error("\n❌ Error fetching recommendations:", error);
    }
}

main();
