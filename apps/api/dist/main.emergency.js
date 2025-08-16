"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
class EmergencyAppModule {
}
async function bootstrap() {
    try {
        const app = await core_1.NestFactory.create(EmergencyAppModule);
        const port = process.env.PORT || 3000;
        await app.listen(port);
        console.log(`🚀 Emergency API server running on port ${port}`);
        console.log('⚠️  This is a minimal emergency build with most features disabled');
    }
    catch (error) {
        console.error('❌ Failed to start emergency server:', error);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.emergency.js.map