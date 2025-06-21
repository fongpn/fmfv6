# Secure Login Flow Documentation

## Overview

The FMF Gym Management System implements a sophisticated secure login flow that provides location-based access control for Customer Service (CS) role users while allowing unrestricted access for Admin users.

## Architecture

### Components

1. **Edge Functions**
   - `secure-login`: Handles authentication and IP verification
   - `resolve-access-request`: Allows admins to approve/deny access requests

2. **Frontend Components**
   - `LoginForm`: Enhanced UI with pending approval states
   - `AuthStore`: Zustand store managing authentication state
   - `auth.ts`: Authentication utilities and API calls

3. **Database Tables**
   - `allowed_ips`: Stores approved IP addresses for CS users
   - `access_requests`: Tracks pending access requests

## Authentication Flow

### For Admin Users
1. User enters credentials
2. Frontend calls `secure-login` Edge Function
3. Edge Function authenticates user
4. If role is 'ADMIN', access is granted immediately
5. User is logged in successfully

### For CS Users
1. User enters credentials
2. Frontend calls `secure-login` Edge Function with IP address
3. Edge Function authenticates user and checks role
4. If role is 'CS':
   - Check if IP address exists in `allowed_ips` table
   - If IP is allowed: Grant access immediately
   - If IP is not allowed: Create access request and return pending status
5. Frontend displays pending approval message
6. Admin must approve the request through admin panel
7. Once approved, CS user can log in from that IP address

## Implementation Details

### Frontend Changes

#### `src/lib/auth.ts`
- ✅ Added `secureSignIn()` function to call Edge Function
- ✅ Added `SecureSignInResponse` interface for type safety
- ✅ Added `checkAccessRequestStatus()` for polling request status
- ✅ Enhanced error handling and response parsing

#### `src/store/authStore.ts`
- ✅ Added `pendingApprovalRequestId` state
- ✅ Modified `signIn()` to use `secureSignIn()` Edge Function
- ✅ Added IP address detection using `getUserIP()`
- ✅ Enhanced error handling for pending approval states
- ✅ Added `clearPendingRequest()` method

#### `src/components/auth/LoginForm.tsx`
- ✅ Added pending approval UI state
- ✅ Enhanced error display with icons and better formatting
- ✅ Added retry and refresh functionality
- ✅ Disabled form inputs during pending state
- ✅ Improved demo credentials display

### Security Features

1. **IP-based Access Control**: CS users can only access from approved locations
2. **Admin Approval Workflow**: New IP addresses require admin approval
3. **Audit Trail**: All access requests are logged with timestamps
4. **Role-based Permissions**: Different access levels for Admin vs CS users

### Error Handling

The system handles various error scenarios:

- **Invalid Credentials**: Standard authentication error
- **Pending Approval**: Special UI state with request ID
- **Network Errors**: Graceful fallback with retry options
- **Unknown IP**: Automatic access request creation

### User Experience

#### Successful Login
- Immediate access for valid credentials from approved locations
- Clean transition to main application

#### Pending Approval
- Clear messaging about approval requirement
- Request ID display for tracking
- Retry and refresh options
- Form disabled to prevent confusion

#### Error States
- Specific error messages for different failure types
- Visual indicators with icons
- Actionable buttons for resolution

## Edge Function Details

### `secure-login` Function

**Endpoints:**
- `POST /secure-login` - Main authentication endpoint
- `GET /secure-login/status/{request_id}` - Check approval status

**Request Format:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "ip_address": "192.168.1.100"
}
```

**Response Formats:**

**Success (Admin or Approved CS):**
```json
{
  "success": true,
  "user": { /* User object */ },
  "profile": { /* Profile object */ },
  "session": { /* Session object */ }
}
```

**Pending Approval (CS from new IP):**
```json
{
  "success": false,
  "status": "PENDING_APPROVAL",
  "message": "Access request pending admin approval",
  "request_id": "uuid-here"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### `resolve-access-request` Function

**Endpoint:** `POST /resolve-access-request`

**Request Format:**
```json
{
  "request_id": "uuid-here",
  "action": "APPROVE" | "DENY"
}
```

## Database Schema

### `allowed_ips` Table
- `id`: UUID primary key
- `ip_address`: Text, unique
- `description`: Text, optional
- `created_by`: UUID, references profiles(id)
- `created_at`: Timestamp

### `access_requests` Table
- `id`: UUID primary key
- `profile_id`: UUID, references profiles(id)
- `ip_address`: Text
- `status`: Text, CHECK ('PENDING', 'APPROVED', 'DENIED')
- `requested_at`: Timestamp
- `resolved_at`: Timestamp, nullable
- `resolved_by`: UUID, references profiles(id), nullable

## Future Enhancements

1. **Auto-polling**: Automatically check approval status
2. **Email Notifications**: Notify admins of pending requests
3. **IP Geolocation**: Display location information for requests
4. **Bulk Approval**: Approve multiple requests at once
5. **Temporary Access**: Time-limited access grants
6. **IP Ranges**: Support for subnet-based approvals

## Troubleshooting

### Common Issues

1. **"Network error occurred"**
   - Check Supabase URL and API key configuration
   - Verify Edge Functions are deployed

2. **"Invalid authentication"**
   - Ensure demo users are created in Supabase Dashboard
   - Verify profile records exist with correct user IDs

3. **Pending approval not working**
   - Check Edge Function logs in Supabase Dashboard
   - Verify database permissions and RLS policies

### Debug Steps

1. Check browser network tab for Edge Function calls
2. Verify IP address detection is working
3. Check Supabase logs for Edge Function errors
4. Verify database records in `access_requests` table

## Security Considerations

1. **IP Spoofing**: Consider additional verification methods
2. **Rate Limiting**: Implement request throttling
3. **Session Management**: Proper token handling and expiration
4. **Audit Logging**: Comprehensive access logging
5. **Data Encryption**: Ensure sensitive data is encrypted

This secure login flow provides a robust foundation for location-based access control while maintaining a smooth user experience for legitimate users.