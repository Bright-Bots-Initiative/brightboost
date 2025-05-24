# Migration Notes: Gamification Features

This document outlines the considerations for migrating the gamification features from the current lowdb implementation to a PostgreSQL database managed by Supabase.

## Current Schema (lowdb)

The current implementation uses a simple JSON-based schema with the following gamification fields in the user model:

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "password": "string (hashed)",
  "role": "string",
  "xp": "number",
  "level": "string",
  "streak": "number",
  "badges": [
    {
      "id": "string",
      "name": "string",
      "awardedAt": "string (ISO date)"
    }
  ]
}
```

## PostgreSQL Schema Design

When migrating to PostgreSQL, consider the following schema design:

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- hashed
  role TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'Explorer',
  streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Badges Table (Relational Approach)

```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_badges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);
```

## Migration Strategy

1. **Create Tables**: Set up the PostgreSQL tables with the schema defined above.

2. **Migrate Users Data**:
   - Copy basic user data (id, name, email, password, role)
   - Copy gamification fields (xp, level, streak)

3. **Migrate Badges**:
   - Create entries in the badges table for each unique badge
   - Link users to their badges through the user_badges junction table

4. **Update API Endpoints**:
   - Update the gamification endpoints to use PostgreSQL queries instead of lowdb
   - Use Supabase client or direct PostgreSQL queries as appropriate

5. **Testing**:
   - Verify that all gamification data has been migrated correctly
   - Test all gamification features with the new database

## Code Changes Required

### Using Supabase Client

Replace lowdb access with Supabase client:

```javascript
// Current lowdb approach
await db.read();
const user = db.data.users.find(u => u.id === req.user.id);
user.xp += amount;
await db.write();

// Supabase approach
const { data, error } = await supabase
  .from('users')
  .update({ xp: user.xp + amount })
  .eq('id', req.user.id)
  .select();
```

### Fetching Badge Data

For badge-related operations, use joins or multiple queries:

```javascript
// Get user with badges
const { data: user, error: userError } = await supabase
  .from('users')
  .select('id, name, xp, level, streak')
  .eq('id', req.user.id)
  .single();

const { data: badges, error: badgesError } = await supabase
  .from('user_badges')
  .select('badge_id, awarded_at, badges(id, name, description, image_url)')
  .eq('user_id', req.user.id);
```

## Data Integrity Considerations

1. **Transactions**: Use transactions for operations that update multiple tables (e.g., awarding a badge and updating XP).

2. **Indices**: Add indices for frequently queried fields like user email and user_id in junction tables.

3. **Constraints**: Implement proper foreign key constraints to maintain referential integrity.

4. **NULL Handling**: Ensure default values are properly set to avoid NULL values in gamification fields.

## Frontend Changes

Update frontend components to work with the new data structure, particularly for badges which will have a more complex relationship structure.
