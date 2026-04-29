import json
import boto3
import hmac
import hashlib
import base64

CLIENT_ID = 'onn0l5qs4rekjnhmglbj5l3s4'
CLIENT_SECRET = 'client-secret-code (not telling you for security :)'

def get_secret_hash(username):
    message = username + CLIENT_ID
    dig = hmac.new(
        CLIENT_SECRET.encode('utf-8'),
        msg=message.encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()

client = boto3.client('cognito-idp', region_name='eu-central-1')

def lambda_handler(event, context):
    body = json.loads(event['body'])
    email = body['email']
    password = body['password']
    
    try:
        response = client.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': email,
                'PASSWORD': password,
                'SECRET_HASH': get_secret_hash(email)
            }
        )
        
        tokens = response['AuthenticationResult']
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'idToken': tokens['IdToken'],
                'accessToken': tokens['AccessToken'],
                'refreshToken': tokens['RefreshToken']
            })
        }
    except Exception as e:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }