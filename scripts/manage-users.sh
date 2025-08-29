#!/bin/bash

# User Management Script for Application Portal
# Usage: ./manage-users.sh [add-admin|remove-admin|add-reviewer|remove-reviewer|list] [email]



case "$1" in
    "add-admin")
        if [ -z "$2" ]; then
            echo "Usage: $0 add-admin <email>"
            exit 1
        fi
        echo "Adding admin: $2"
        wrangler d1 execute DB --local --command "INSERT OR IGNORE INTO admins (email) VALUES ('$2')"
        echo "✅ Added $2 as admin"
        ;;
    
    "remove-admin")
        if [ -z "$2" ]; then
            echo "Usage: $0 remove-admin <email>"
            exit 1
        fi
        echo "Removing admin: $2"
        wrangler d1 execute DB --local --command "DELETE FROM admins WHERE email = '$2'"
        wrangler d1 execute DB --local --command "UPDATE applications SET assigned_to = NULL, review_status = 'unassigned', assigned_at = NULL, reviewed_at = NULL WHERE assigned_to = '$2'"
        
        wrangler d1 execute DB --remote --command "DELETE FROM admins WHERE email = '$2'"
        wrangler d1 execute DB --remote --command "UPDATE applications SET assigned_to = NULL, review_status = 'unassigned', assigned_at = NULL, reviewed_at = NULL WHERE assigned_to = '$2'"

        echo "✅ Removed $2 as admin and unassigned their applications"
        ;;
    
    "add-reviewer")
        if [ -z "$2" ]; then
            echo "Usage: $0 add-reviewer <email>"
            exit 1
        fi
        echo "Adding reviewer: $2"
        wrangler d1 execute DB --local --command "INSERT OR IGNORE INTO reviewers (email) VALUES ('$2')"
        echo "✅ Added $2 as reviewer"
        ;;
    
    "remove-reviewer")
        if [ -z "$2" ]; then
            echo "Usage: $0 remove-reviewer <email>"
            exit 1
        fi
        echo "Removing reviewer: $2"
        wrangler d1 execute DB --local --command "DELETE FROM reviewers WHERE email = '$2'"
        wrangler d1 execute DB --local --command "UPDATE applications SET assigned_to = NULL, review_status = 'unassigned', assigned_at = NULL, reviewed_at = NULL WHERE assigned_to = '$2'"
        echo "✅ Removed $2 as reviewer and unassigned their applications"
        ;;
    
    "list")
        echo "=== ADMINS ==="
        wrangler d1 execute DB --local --command "SELECT email, created_at FROM admins ORDER BY email"
        echo ""
        echo "=== REVIEWERS ==="
        wrangler d1 execute DB --local --command "SELECT email, created_at FROM reviewers ORDER BY email"
        ;;
    
    *)
        echo "Application Portal User Management"
        echo ""
        echo "Usage: $0 [command] [email]"
        echo ""
        echo "Commands:"
        echo "  add-admin <email>     Add user as admin (access: /admin)"
        echo "  remove-admin <email>  Remove admin access"
        echo "  add-reviewer <email>  Add user as reviewer (access: /review)" 
        echo "  remove-reviewer <email> Remove reviewer access"
        echo "  list                  List all admins and reviewers"
        echo ""
        echo "Examples:"
        echo "  $0 add-admin admin@example.com"
        echo "  $0 add-reviewer reviewer@example.com"
        echo "  $0 list"
        echo ""
        echo "Note: Admins have full access. Reviewers can only access their review queue."
        ;;
esac