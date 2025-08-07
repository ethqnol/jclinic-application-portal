#!/bin/bash

# Script to add an admin user to the application portal
# Usage: ./scripts/add-admin.sh admin@example.com

if [ $# -eq 0 ]; then
    echo "Usage: $0 <admin-email>"
    echo "Example: $0 admin@example.com"
    exit 1
fi

ADMIN_EMAIL=$1

echo "Adding admin user: $ADMIN_EMAIL"

# Add to local database
echo "Adding to local database..."
wrangler d1 execute application-portal-db --command "INSERT INTO admins (email) VALUES ('$ADMIN_EMAIL')"

# Add to remote database
echo "Adding to remote database..."
wrangler d1 execute application-portal-db --command "INSERT INTO admins (email) VALUES ('$ADMIN_EMAIL')" --remote

echo "✅ Admin user $ADMIN_EMAIL added successfully to both local and remote databases!"
echo "They can now access the admin dashboard at /admin"