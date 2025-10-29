import { jest } from '@jest/globals';
import AWSMock from 'aws-sdk-mock';

// Mock the handler imports
const mockGetCommand = jest.fn();
const mockScanCommand = jest.fn();
const mockGetObjectCommand = jest.fn();

jest.unstable_mockModule('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn(() => ({
            send: jest.fn()
        }))
    },
    GetCommand: mockGetCommand,
    ScanCommand: mockScanCommand
}));

jest.unstable_mockModule('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn()
}));

jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(),
    GetObjectCommand: mockGetObjectCommand
}));

const { predict, health, getModelInfo, corsHandler } = await import('../handler.js');

describe('Model API Lambda Functions', () => {
    let mockDocClient;
    let mockS3Client;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mock clients
        mockDocClient = {
            send: jest.fn()
        };
        
        mockS3Client = {
            send: jest.fn()
        };

        // Mock environment variables
        process.env.DYNAMODB_TABLE = 'test-table';
        process.env.S3_BUCKET = 'test-bucket';
        process.env.AWS_REGION = 'us-east-1';
    });

    describe('predict function', () => {
        const validEvent = {
            pathParameters: {
                userId: 'user123',
                modelId: 'model456'
            },
            headers: {
                'x-api-key': 'a'.repeat(64) // Valid 64-char hex string
            },
            body: JSON.stringify({
                feature1: 10,
                feature2: 'test'
            }),
            isBase64Encoded: false,
            requestContext: {
                requestId: 'test-request-id'
            }
        };

        const mockModelMetadata = {
            modelId: 'model456',
            userId: 'user123',
            name: 'Test Model',
            s3Key: 'models/test-model.pkl',
            framework: 'scikit-learn',
            version: 'v1.0.0',
            inputs: [
                { name: 'feature1', type: 'number', required: true },
                { name: 'feature2', type: 'string', required: true }
            ],
            outputType: 'classification'
        };

        test('should return 400 for missing path parameters', async () => {
            const event = {
                pathParameters: {},
                headers: { 'x-api-key': 'a'.repeat(64) },
                body: '{}',
                requestContext: { requestId: 'test' }
            };

            const result = await predict(event);
            
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toContain('Missing required path parameters');
        });

        test('should return 401 for invalid API key', async () => {
            const event = {
                ...validEvent,
                headers: { 'x-api-key': 'invalid-key' }
            };

            const result = await predict(event);
            
            expect(result.statusCode).toBe(401);
            expect(JSON.parse(result.body).error).toContain('API key');
        });

        test('should return 400 for invalid JSON body', async () => {
            const event = {
                ...validEvent,
                body: 'invalid json'
            };

            const result = await predict(event);
            
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toContain('Invalid JSON');
        });

        test('should return 404 for non-existent model', async () => {
            // Mock DynamoDB to return no item
            mockDocClient.send.mockResolvedValueOnce({ Item: null });

            const result = await predict(validEvent);
            
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body).error).toContain('Model not found');
        });

        test('should return 400 for validation errors', async () => {
            // Mock DynamoDB to return model metadata
            mockDocClient.send.mockResolvedValueOnce({ Item: mockModelMetadata });

            const event = {
                ...validEvent,
                body: JSON.stringify({
                    feature1: 'not a number', // Should be number
                    feature2: 'test'
                })
            };

            const result = await predict(event);
            
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toContain('Input validation failed');
        });

        test('should return successful prediction', async () => {
            // Mock DynamoDB to return model metadata
            mockDocClient.send.mockResolvedValueOnce({ Item: mockModelMetadata });
            
            // Mock S3 to return model buffer
            const mockStream = {
                on: jest.fn((event, callback) => {
                    if (event === 'data') callback(Buffer.from('model data'));
                    if (event === 'end') callback();
                }),
            };
            mockS3Client.send.mockResolvedValueOnce({ Body: mockStream });

            const result = await predict(validEvent);
            
            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
            expect(response.prediction).toBeDefined();
            expect(response.metadata.modelId).toBe('model456');
        });

        test('should handle version mismatch', async () => {
            const eventWithVersion = {
                ...validEvent,
                pathParameters: {
                    ...validEvent.pathParameters,
                    version: 'v2.0.0'
                }
            };

            // Mock DynamoDB to return model metadata with different version
            mockDocClient.send.mockResolvedValueOnce({ Item: mockModelMetadata });

            const result = await predict(eventWithVersion);
            
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toContain('Version mismatch');
        });
    });

    describe('health function', () => {
        test('should return healthy status', async () => {
            // Mock successful DynamoDB scan
            mockDocClient.send.mockResolvedValueOnce({ Items: [] });

            const result = await health({});
            
            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            expect(response.status).toBe('healthy');
            expect(response.services.dynamodb).toBe('connected');
        });

        test('should return unhealthy status on error', async () => {
            // Mock DynamoDB error
            mockDocClient.send.mockRejectedValueOnce(new Error('Connection failed'));

            const result = await health({});
            
            expect(result.statusCode).toBe(503);
            const response = JSON.parse(result.body);
            expect(response.status).toBe('unhealthy');
        });
    });

    describe('getModelInfo function', () => {
        const validEvent = {
            pathParameters: {
                userId: 'user123',
                modelId: 'model456'
            }
        };

        const mockModelMetadata = {
            modelId: 'model456',
            userId: 'user123',
            name: 'Test Model',
            description: 'A test model',
            version: 'v1.0.0',
            framework: 'scikit-learn',
            modelType: 'classification',
            outputType: 'classification',
            inputs: [
                { name: 'feature1', type: 'number', required: true }
            ],
            createdAt: '2024-01-01T00:00:00Z',
            s3Key: 'models/test-model.pkl' // This should not be in response
        };

        test('should return model info without sensitive data', async () => {
            // Mock DynamoDB to return model metadata
            mockDocClient.send.mockResolvedValueOnce({ Item: mockModelMetadata });

            const result = await getModelInfo(validEvent);
            
            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            expect(response.modelId).toBe('model456');
            expect(response.name).toBe('Test Model');
            expect(response.s3Key).toBeUndefined(); // Should not expose S3 key
            expect(response.apiEndpoint).toBeDefined();
        });

        test('should return 404 for non-existent model', async () => {
            // Mock DynamoDB to return no item
            mockDocClient.send.mockResolvedValueOnce({ Item: null });

            const result = await getModelInfo(validEvent);
            
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body).error).toContain('Model not found');
        });

        test('should return 400 for missing parameters', async () => {
            const event = { pathParameters: {} };

            const result = await getModelInfo(event);
            
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).error).toContain('Missing userId or modelId');
        });
    });

    describe('corsHandler function', () => {
        test('should return CORS headers', async () => {
            const result = await corsHandler({});
            
            expect(result.statusCode).toBe(200);
            expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
            expect(result.headers['Access-Control-Allow-Methods']).toContain('POST');
            expect(result.headers['Access-Control-Allow-Headers']).toContain('Authorization');
        });
    });

    describe('Input validation', () => {
        test('should validate different input types correctly', async () => {
            const schemas = [
                { name: 'age', type: 'number', required: true, min: 0, max: 150 },
                { name: 'email', type: 'email', required: true },
                { name: 'category', type: 'categorical', required: true, allowedValues: ['A', 'B', 'C'] },
                { name: 'active', type: 'boolean', required: false },
                { name: 'tags', type: 'array', required: false, min: 1, max: 5 }
            ];

            const validData = {
                age: 25,
                email: 'test@example.com',
                category: 'A',
                active: true,
                tags: ['tag1', 'tag2']
            };

            const mockModelMetadata = {
                modelId: 'test',
                userId: 'user123',
                name: 'Test Model',
                s3Key: 'test-key',
                framework: 'test',
                inputs: schemas,
                outputType: 'classification'
            };

            // Mock DynamoDB and S3
            mockDocClient.send.mockResolvedValueOnce({ Item: mockModelMetadata });
            const mockStream = {
                on: jest.fn((event, callback) => {
                    if (event === 'data') callback(Buffer.from('model data'));
                    if (event === 'end') callback();
                }),
            };
            mockS3Client.send.mockResolvedValueOnce({ Body: mockStream });

            const event = {
                pathParameters: { userId: 'user123', modelId: 'test' },
                headers: { 'x-api-key': 'a'.repeat(64) },
                body: JSON.stringify(validData),
                requestContext: { requestId: 'test' }
            };

            const result = await predict(event);
            expect(result.statusCode).toBe(200);
        });
    });
});
