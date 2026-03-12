from firebase_admin import credentials, initialize_app, storage

def main():
    print("Initializing Firebase...")
    cred = credentials.Certificate(r'C:\Users\lotus\Documents\369\six9studio-firebase-adminsdk-fbsvc-5e28b691dc.json')
    try:
        initialize_app(cred, {'storageBucket': 'six9studio.firebasestorage.app'})
    except Exception:
        pass # Already initialized in some envs, though this is a standalone script
    
    print("Getting bucket...")
    bucket = storage.bucket()
    
    print("Setting CORS policy...")
    bucket.cors = [
        {
            "origin": ["*"],
            "method": ["GET", "HEAD", "OPTIONS"],
            "responseHeader": ["*"],
            "maxAgeSeconds": 3600
        }
    ]
    bucket.patch()
    
    print("CORS policy successfully updated for gs://six9studio.firebasestorage.app!")

if __name__ == '__main__':
    main()
