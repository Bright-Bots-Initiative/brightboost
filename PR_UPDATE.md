## Lambda VPC Connectivity Issue Investigation

### Current Status
- ✅ CI deployment completed successfully 
- ✅ Lambda execution role has correct `secretsmanager:GetSecretValue` permission with wildcard suffix
- ❌ Lambda function times out after 30 seconds when accessing AWS Secrets Manager
- ❌ API Gateway requests hang indefinitely due to Lambda timeout

### Root Cause Analysis
The CloudWatch logs show the Lambda function consistently times out while "Fetching database secret from Secrets Manager" despite having the correct IAM permissions. This indicates a **VPC connectivity issue** preventing the Lambda function from reaching AWS services.

### Investigation Results
1. **IAM Policy Confirmed**: The Lambda execution role `brightboost-teacher-signu-TeacherSignupFunctionRole-NX81foP6ZBFk` has the correct policy with wildcard suffix:
   ```json
   {
     "Action": ["secretsmanager:GetSecretValue"],
     "Resource": "arn:aws:secretsmanager:us-east-1:012876801822:secret:brightboost/aurora/prod-A7vWnk*",
     "Effect": "Allow"
   }
   ```

2. **Lambda Function Logs**: Multiple timeout events show the function starts successfully but hangs on Secrets Manager API calls:
   ```
   2025-06-09T23:35:32.756Z INFO Fetching database secret from Secrets Manager...
   2025-06-09T23:36:02.676Z Task timed out after 30.06 seconds
   ```

### Required Infrastructure Fix
The Lambda function is deployed in VPC subnets that lack proper routing to AWS services. This requires one of the following solutions:

1. **VPC Endpoints** (Recommended): Create VPC endpoints for Secrets Manager to allow private connectivity
2. **NAT Gateway**: Configure NAT Gateway for Lambda subnets to access internet-based AWS services  
3. **Route Table Fix**: Ensure Lambda subnets are associated with route tables that have internet gateway access

### Next Steps
- Investigate VPC endpoint configuration for Secrets Manager
- Check route table associations for Lambda subnets
- Recommend infrastructure changes to resolve connectivity

### API Endpoint
- **URL**: `https://h5ztvjxo03.execute-api.us-east-1.amazonaws.com/dev/api/signup/teacher`
- **Status**: Deployed but non-functional due to VPC connectivity
- **Stack**: `brightboost-teacher-signup-feat-teacher-signup-mvp`
