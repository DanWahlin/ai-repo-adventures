# Adventure Types & Code Mapping

## 🗺️ Adventure Categories

### 1. **The Main Quest** (Primary Code Flow)
**Triggered by**: Main entry point and primary execution path
**Example Path**: `index.ts → server.ts → router.ts → handlers.ts`
**Story**: "Follow the primary mission from launch to completion"

### 2. **Configuration Caverns**
**Triggered by**: Config files detected (`.env`, `config.json`, `settings.ts`)
**Explores**: 
- Environment variables
- Feature flags
- Database connections
- API keys and secrets
**Story**: "Discover the ancient scrolls that control the realm"

### 3. **Test Chamber Trials**
**Triggered by**: Test files detected (`*.test.ts`, `*.spec.js`)
**Explores**:
- Unit tests → "Individual skill challenges"
- Integration tests → "Team coordination trials"
- E2E tests → "Full adventure simulations"
**Story**: "Prove your worth through trials and challenges"

### 4. **API Gateway Expedition**
**Triggered by**: Routes/endpoints detected
**Explores**:
- REST endpoints → "Communication portals"
- GraphQL schema → "Universal translator"
- WebSocket connections → "Real-time channels"
**Story**: "Master the art of interdimensional communication"

### 5. **Database Depths**
**Triggered by**: Database files/ORM models detected
**Explores**:
- Models/Schemas → "Ancient blueprints"
- Migrations → "Timeline alterations"
- Queries → "Seeking wisdom"
**Story**: "Descend into the data vaults where all knowledge is stored"

### 6. **Dependency Nexus**
**Triggered by**: package.json analysis
**Explores**:
- Core dependencies → "Allied forces"
- Dev dependencies → "Training equipment"
- Peer dependencies → "Diplomatic relations"
**Story**: "Visit the alliance hub where external powers converge"

### 7. **Build Pipeline Rapids**
**Triggered by**: Build configs detected
**Explores**:
- Webpack/Vite → "Forge masters"
- TypeScript compiler → "Language translator"
- CI/CD → "Automated guardians"
**Story**: "Ride the automated current from source to deployment"

### 8. **Error Handling Fortress**
**Triggered by**: Error handling patterns detected
**Explores**:
- Try/catch blocks → "Safety nets"
- Error classes → "Alert systems"
- Logging → "Historical records"
**Story**: "Learn the defensive arts of the code kingdom"

## 🎯 Smart Adventure Selection

### For Small Projects (< 10 files)
```typescript
adventures = [
  "Main Quest",
  "Configuration Caverns", 
  "Meet the Key Characters" (top 3 classes/functions)
]
```

### For Medium Projects (10-50 files)
```typescript
adventures = [
  "Main Quest - Chapter 1" (entry to first major component),
  "Main Quest - Chapter 2" (core business logic),
  "Test Chamber Trials",
  "API Gateway Expedition",
  "Configuration Caverns"
]
```

### For Large Projects (50+ files)
```typescript
adventures = {
  "Epic Quests": [
    "Frontend Realm",
    "Backend Kingdom", 
    "Database Depths"
  ],
  "Side Quests": [
    "Utility Workshop",
    "Testing Grounds",
    "Configuration Archives"
  ],
  "Advanced": [
    "Performance Optimization Dojo",
    "Security Fortress",
    "Scaling Summit"
  ]
}
```

## 🔄 Dynamic Adventure Generation

```typescript
function generateAdventures(analysis: CodeAnalysis): Adventure[] {
  const adventures = [];
  
  // Always include main flow
  if (analysis.codeFlow) {
    adventures.push({
      name: "The Main Quest",
      description: `Follow the path from ${analysis.codeFlow.entryPoint}`,
      complexity: analysis.codeFlow.executionOrder.length
    });
  }
  
  // Add based on detected features
  if (analysis.hasTests) {
    adventures.push({
      name: "Test Chamber Trials",
      description: "Prove your understanding through challenges"
    });
  }
  
  if (analysis.hasApi) {
    adventures.push({
      name: "API Gateway Expedition",
      description: "Master the communication channels"
    });
  }
  
  // Add complexity-based adventures
  if (analysis.functions.length > 20) {
    adventures.push({
      name: "Function Library Tour",
      description: "Meet the many specialists of this realm"
    });
  }
  
  return adventures;
}
```

## 📝 Adventure Content Examples

### Space Theme - API Adventure
"You approach the **Communication Array** where Commander REST maintains the channels to distant systems. Each endpoint is a precisely calibrated frequency:
- `GET /users` - Scan for life signs
- `POST /missions` - Launch new expeditions  
- `PUT /config` - Adjust system parameters"

### Medieval Theme - Database Adventure
"You descend into the **Crystal Caverns** where the Data Oracle guards the accumulated wisdom of ages. Ancient scrolls (migrations) tell of how these caverns were shaped, while mystical queries unlock specific knowledge."

### Ancient Theme - Test Adventure
"The **Trial Grounds** await. Here, automated guardians test every warrior's skill. Unit trials test individual prowess, while integration ceremonies ensure the clan works as one."