# Test Credit System Documentation

## Testing the Credit/Token System

### 1. Upload Test Models

Upload models with different pricing configurations:

**Free Model:**
- Pricing Type: "free"
- Credits Per Call: 0

**Paid Model:**
- Pricing Type: "paid" 
- Credits Per Call: 5

### 2. Test API Endpoints

#### Get Model Info
```bash
curl -X GET "http://localhost:6003/api/predict/{modelId}/info"
```

Should return:
```json
{
  "success": true,
  "model": {
    "modelId": "uuid",
    "name": "Test Model",
    "pricingType": "paid",
    "creditsPerCall": 5,
    "inputs": [...],
    "outputType": "classification"
  }
}
```

#### Make Prediction (Free Model)
```bash
curl -X POST "http://localhost:6003/api/predict/{modelId}/predict" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your-api-key" \
  -d '{"feature1": 1.5, "feature2": "test"}'
```

Should return:
```json
{
  "success": true,
  "prediction": {...},
  "creditsUsed": 0,
  "remainingCredits": 100
}
```

#### Make Prediction (Paid Model)
```bash
curl -X POST "http://localhost:6003/api/predict/{modelId}/predict" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your-api-key" \
  -d '{"feature1": 1.5, "feature2": "test"}'
```

Should return:
```json
{
  "success": true,
  "prediction": {...},
  "creditsUsed": 5,
  "remainingCredits": 95
}
```

#### Insufficient Credits
If user has less credits than required:
```json
{
  "success": false,
  "error": "Insufficient credits",
  "required": 5,
  "available": 2
}
```

### 3. Test Frontend Components

#### ModelList Component:
- Shows user's own models
- Displays pricing information correctly
- Shows current credit balance
- Displays free vs paid model counts

#### CommunityHub Component:
- Shows all models in marketplace
- Allows filtering by pricing type
- Shows proper pricing information
- Provides API endpoints for testing

### 4. Expected Behaviors

1. **Free Models**: No credits deducted from API user
2. **Paid Models**: 
   - Credits deducted from API user
   - Same amount credited to model owner
   - Rejection if insufficient credits
3. **Credit Display**: Real-time credit balance updates
4. **Pricing Info**: Clear display of costs per API call

### 5. Database Verification

Check users table for credit changes:
```sql
SELECT id, name, credits FROM users WHERE api_key = 'your-api-key';
```

Check models table for pricing info:
```sql
-- For DynamoDB, use AWS Console or CLI
aws dynamodb scan --table-name MLModels --projection-expression "modelId,pricingType,creditsPerCall"
```