
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isCloudflarePages = process.env.CF_PAGES === 'true';

if (isCloudflarePages) {
  console.log('Detected Cloudflare Pages build environment');
  
  const envContent = `
# Public Supabase variables
NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycldhifnaycqmqnxzgxr.supabase.co'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}

# Note: SUPABASE_SERVICE_ROLE is handled as an encrypted secret
# and will be available at runtime but not during build
`;

  fs.writeFileSync(path.join(process.cwd(), '.env.production'), envContent.trim());
  console.log('Created .env.production file with public variables');
}

process.exit(0);
