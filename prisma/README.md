# BrightBoost Database Migrations

This directory contains Prisma schema and migration files for the BrightBoost application.

## Local Development

To run migrations in your local development environment:

```bash
# Create a new migration (after schema changes)
npx prisma migrate dev --name descriptive_name

# Apply existing migrations
npx prisma migrate dev

# Reset database (caution: deletes all data)
npx prisma migrate reset
```

## Production Deployment

For production deployment on Azure:

1. Ensure the `POSTGRES_URL` environment variable is set in your Azure App Service configuration
2. Run the production migration script:

```bash
./migrate-prod.sh
```

Or manually run:

```bash
npx prisma migrate deploy
```

## Database Schema

The database schema includes the following models:

- **User**: Authentication and user profile data with gamification fields
- **Lesson**: Educational content created by teachers
- **Activity**: Student progress tracking for lessons
- **Course**: Course management
- **Enrollment**: Student-course relationships
- **Assignment**: Assignment tracking
- **Badge**: Achievement badges for gamification

## Troubleshooting

If you encounter connection issues:

1. Verify your PostgreSQL connection string in `.env` file
2. Ensure the database server is running and accessible
3. Check firewall rules to allow connections from your IP address
