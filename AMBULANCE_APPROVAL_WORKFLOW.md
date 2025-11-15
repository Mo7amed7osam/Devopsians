# Ambulance Approval Workflow - Updated

## Overview
This document describes the updated patient transport workflow where ambulances must approve pickup requests before starting transport, and patients are notified when the ambulance is on the way.

## Key Changes

### 1. Two-Step Ambulance Assignment
- **Step 1:** Receptionist approves request → Ambulance is assigned but status remains `AVAILABLE`
- **Step 2:** Ambulance crew accepts request → Status changes to `EN_ROUTE` and patient is notified

### 2. Patient Notifications
- Patient receives real-time notification when ambulance accepts pickup
- Patient dashboard shows visual status indicators
- Socket.IO event `ambulanceOnTheWay` triggers notification

## Complete Workflow

### Step 1: Patient Reserves ICU
```
Patient → Selects ICU → Reserves room
Status: null → RESERVED
ICU Status: Available → Occupied
```

**Patient sees:** "Your ICU reservation is pending. Waiting for receptionist approval..."

---

### Step 2: Receptionist Approves with Ambulance
```
Receptionist → Views pending request → Clicks "Approve" → Selects "Yes, send ambulance" → Enters pickup location
```

**What happens:**
1. System finds available ambulance (status = `AVAILABLE`, assignedPatient = null)
2. Ambulance is assigned:
   - `assignedPatient` = patient ID
   - `assignedHospital` = hospital ID
   - `destination` = hospital name
   - `status` = **AVAILABLE** (stays available, waiting for crew approval)
3. Patient updated:
   - `patientStatus` = `AWAITING_PICKUP`
   - `assignedAmbulance` = ambulance ID
   - `pickupLocation` = entered address
   - `needsPickup` = true
4. Socket.IO event `ambulanceAssigned` emitted

**Patient sees:** 
```
🚑 Ambulance Requested
An ambulance has been assigned to pick you up. The crew will accept shortly.
Pickup Location: [address]
```

**Ambulance sees:** 
```
🚑 New Pickup Request!
Patient ID: [patient_id]
Destination: [hospital_name]
A patient needs pickup. Accept to start the journey and update your status to EN ROUTE.

[✅ Accept Pickup Request] button
```

---

### Step 3: Ambulance Crew Accepts Pickup
```
Ambulance → Sees pending request → Clicks "Accept Pickup Request"
```

**What happens:**
1. Ambulance status updated: `AVAILABLE` → `EN_ROUTE`
2. Patient status updated: `AWAITING_PICKUP` → `IN_TRANSIT`
3. Socket.IO events emitted:
   - `pickupAccepted` - General notification
   - `ambulanceOnTheWay` - Specific to patient
4. Patient receives notification toast:
   ```
   🚑 Your ambulance is on the way! Your ambulance is heading to [hospital_name]!
   ```

**Patient sees:**
```
🚐 Ambulance En Route!
Your ambulance is on the way to pick you up! Please be ready.
Pickup Location: [address]
```

**Ambulance sees:**
```
🚨 Active Transport
Patient ID: [patient_id]
Destination: [hospital_name]
ETA: [x] minutes

[🏥 Mark Patient Arrived] button
```

**GPS tracking:** Demo mode starts with location updates every 15 seconds

---

### Step 4: Transport in Progress
```
Ambulance transports patient to hospital
Patient Status: IN_TRANSIT
Ambulance Status: EN_ROUTE
```

**Real-time updates:**
- Location updated every 15 seconds (demo mode)
- Distance and ETA calculated
- Receptionist monitors progress
- Patient sees "Ambulance En Route!" status

---

### Step 5: Arrival at Hospital
```
Ambulance → Clicks "Mark Patient Arrived"
```

**What happens:**
1. Patient status: `IN_TRANSIT` → `ARRIVED`
2. Ambulance status: `EN_ROUTE` → `ARRIVED_HOSPITAL`
3. Socket.IO event `patientArrived` emitted
4. Receptionist notified

**Patient sees:**
```
🏥 You Have Arrived!
You have arrived at the hospital. The receptionist will check you in shortly.
```

**Receptionist sees:** Patient with **ARRIVED** badge in dashboard

---

### Step 6: Check-In
```
Receptionist → Clicks "Direct Check-In"
```

**What happens:**
1. Validates patient status is `ARRIVED`
2. Patient status: `ARRIVED` → `CHECKED_IN`
3. Ambulance freed:
   - Status: `ARRIVED_HOSPITAL` → `AVAILABLE`
   - Cleared: `assignedPatient`, `assignedHospital`, `destination`, `eta`
4. Patient cleared: `assignedAmbulance`, `pickupLocation`, `needsPickup`
5. ICU `checkedInAt` timestamp recorded
6. Socket.IO event `patientCheckedIn` emitted

**Patient receives notification:**
```
You have been checked in to [hospital_name] - Room [room_number]!
```

---

## UI Components

### Ambulance Panel - Pending Request View
**Shows when:** Ambulance has `assignedPatient` AND status = `AVAILABLE`

```jsx
┌─────────────────────────────────────────┐
│ 🚑 New Pickup Request!                  │
│                                         │
│ Patient ID: 507f1f77bcf86cd799439011   │
│ Destination: Cairo General Hospital     │
│                                         │
│ A patient needs pickup. Accept to start │
│ the journey and update your status to   │
│ EN ROUTE.                               │
│                                         │
│ [✅ Accept Pickup Request]              │
└─────────────────────────────────────────┘
```

### Ambulance Panel - Active Transport View
**Shows when:** Ambulance has `assignedPatient` AND status = `EN_ROUTE`

```jsx
┌─────────────────────────────────────────┐
│ 🚨 Active Transport                     │
│                                         │
│ Patient ID: 507f1f77bcf86cd799439011   │
│ Destination: Cairo General Hospital     │
│ ETA: 12 minutes                         │
│                                         │
│ [🏥 Mark Patient Arrived]               │
└─────────────────────────────────────────┘
```

### Patient Dashboard - Status Banners

**AWAITING_PICKUP (Yellow):**
```jsx
┌─────────────────────────────────────────┐
│ 🚑 Ambulance Requested                  │
│                                         │
│ An ambulance has been assigned to pick  │
│ you up. The crew will accept shortly.   │
│                                         │
│ Pickup Location: 123 Main St, Cairo    │
└─────────────────────────────────────────┘
```

**IN_TRANSIT (Blue):**
```jsx
┌─────────────────────────────────────────┐
│ 🚐 Ambulance En Route!                  │
│                                         │
│ Your ambulance is on the way to pick    │
│ you up! Please be ready.                │
│                                         │
│ Pickup Location: 123 Main St, Cairo    │
└─────────────────────────────────────────┘
```

**ARRIVED (Green):**
```jsx
┌─────────────────────────────────────────┐
│ 🏥 You Have Arrived!                    │
│                                         │
│ You have arrived at the hospital. The   │
│ receptionist will check you in shortly. │
│                                         │
│ Pickup Location: 123 Main St, Cairo    │
└─────────────────────────────────────────┘
```

## Socket.IO Events

### `ambulanceAssigned`
**When:** Receptionist approves request with ambulance pickup
**Audience:** Ambulance crew
**Payload:**
```javascript
{
  ambulanceId: String,
  patientId: String,
  patientName: String,
  hospitalId: String,
  hospitalName: String,
  pickupLocation: String,
  destination: String
}
```

### `pickupAccepted`
**When:** Ambulance crew accepts pickup request
**Audience:** Receptionists, admins
**Payload:**
```javascript
{
  ambulanceId: String,
  patientId: String,
  patientName: String
}
```

### `ambulanceOnTheWay`
**When:** Ambulance crew accepts pickup request
**Audience:** Patient (specific)
**Payload:**
```javascript
{
  patientId: String,
  ambulanceId: String,
  ambulanceName: String,
  destination: String,
  hospitalName: String,
  message: "Your ambulance is on the way!"
}
```

### `patientArrived`
**When:** Ambulance marks patient as arrived
**Audience:** Receptionists
**Payload:**
```javascript
{
  ambulanceId: String,
  patientId: String,
  patientName: String,
  hospitalId: String
}
```

### `patientCheckedIn`
**When:** Receptionist checks in patient
**Audience:** Patient (specific)
**Payload:**
```javascript
{
  icuId: String,
  patientId: String,
  hospitalName: String,
  room: String
}
```

## API Changes

### Modified Endpoint: `POST /api/receptionist/approve-request`

**Previous behavior:**
- Assigned ambulance with status = `EN_ROUTE` immediately

**New behavior:**
- Assigns ambulance but keeps status = `AVAILABLE`
- Ambulance must explicitly accept to change to `EN_ROUTE`

**Query to find available ambulance:**
```javascript
const availableAmbulance = await User.findOne({
  role: 'Ambulance',
  status: 'AVAILABLE',
  assignedPatient: null  // NEW: Ensure not already assigned
});
```

### Modified Endpoint: `POST /api/ambulance/:ambulanceId/accept-pickup`

**Added functionality:**
1. Updates ambulance status to `EN_ROUTE`
2. Emits `ambulanceOnTheWay` event for patient notification

**Before:**
```javascript
// Only updated patient status
patient.patientStatus = 'IN_TRANSIT';
```

**After:**
```javascript
// Updates BOTH ambulance and patient status
ambulance.status = 'EN_ROUTE';
patient.patientStatus = 'IN_TRANSIT';

// Emits patient-specific notification
io.emit('ambulanceOnTheWay', {
  patientId: patient._id,
  message: "Your ambulance is on the way!",
  // ... other details
});
```

## Frontend Changes

### AmbulancePanel.jsx

**Added:** Conditional rendering based on ambulance status
```javascript
// Pending request (status = AVAILABLE, has assignedPatient)
{myAmbulance?.assignedPatient && myAmbulance?.status === 'AVAILABLE' && (
  <PendingRequestUI />
)}

// Active transport (status = EN_ROUTE, has assignedPatient)
{myAmbulance?.assignedPatient && myAmbulance?.status === 'EN_ROUTE' && (
  <ActiveTransportUI />
)}
```

**Modified:** `handleAcceptPickup()` now updates status to EN_ROUTE first
```javascript
const handleAcceptPickup = async () => {
  // First update status to EN_ROUTE
  await handleStatusUpdate('EN_ROUTE');
  
  // Then accept the pickup (updates patient, emits events)
  await fetch('/api/ambulance/.../accept-pickup', {...});
};
```

### PatientHomePage.jsx

**Added:** Socket listener for `ambulanceOnTheWay` event
```javascript
socket.on('ambulanceOnTheWay', (data) => {
  if (data.patientId === userId) {
    toast.success(`🚑 ${data.message}...`, {
      autoClose: 8000,
      position: "top-center"
    });
  }
});
```

**Added:** Visual status banners based on `patientStatus`
- `AWAITING_PICKUP` → Yellow banner
- `IN_TRANSIT` → Blue banner  
- `ARRIVED` → Green banner

## User Experience Flow

### Patient Perspective
1. ✅ Reserve ICU room
2. ⏳ See "Pending approval" message
3. 🚑 Receptionist approves → See "Ambulance Requested" (yellow banner)
4. 🚐 Ambulance accepts → **Receive toast notification** → See "Ambulance En Route!" (blue banner)
5. 🏥 Ambulance arrives → See "You Have Arrived!" (green banner)
6. ✅ Receptionist checks in → **Receive toast notification** → See ICU details

### Ambulance Crew Perspective
1. 🔔 Receive assignment notification
2. 👁️ See "New Pickup Request!" card
3. ✅ Click "Accept Pickup Request" → Status changes to EN_ROUTE
4. 🚐 See "Active Transport" card with arrival button
5. 🏥 Click "Mark Patient Arrived" → Patient ready for check-in
6. ✅ After check-in → Status back to AVAILABLE

### Receptionist Perspective
1. 📋 See pending ICU request
2. ✅ Approve with ambulance option
3. 👀 Monitor EN_ROUTE ambulances (after crew accepts)
4. 🏥 See ARRIVED badge when patient arrives
5. ✅ Check in patient → Ambulance freed

## Testing Checklist

- [ ] Patient reserves ICU → Status: RESERVED
- [ ] Receptionist sees pending request
- [ ] Receptionist approves with pickup → Ambulance assigned (still AVAILABLE)
- [ ] Ambulance sees "New Pickup Request!" card
- [ ] Ambulance clicks "Accept Pickup Request"
- [ ] Ambulance status changes to EN_ROUTE
- [ ] Patient receives toast notification: "Your ambulance is on the way!"
- [ ] Patient dashboard shows blue "Ambulance En Route!" banner
- [ ] Patient status is IN_TRANSIT
- [ ] Receptionist monitors EN_ROUTE ambulance
- [ ] Ambulance clicks "Mark Patient Arrived"
- [ ] Patient dashboard shows green "You Have Arrived!" banner
- [ ] Patient status is ARRIVED
- [ ] Receptionist sees ARRIVED badge
- [ ] Receptionist clicks "Direct Check-In"
- [ ] Patient receives toast notification: "You have been checked in..."
- [ ] Patient status is CHECKED_IN
- [ ] Ambulance status is AVAILABLE
- [ ] Ambulance fields cleared (assignedPatient, etc.)

## Error Handling

### No Available Ambulances
**Scenario:** All ambulances are assigned or EN_ROUTE

**Response:**
```json
{
  "success": false,
  "message": "No available ambulance at the moment"
}
```

**User sees:** Error toast with message

### Patient Not Found
**Scenario:** Invalid patient ID in accept-pickup request

**Response:**
```json
{
  "success": false,
  "message": "Patient not found"
}
```

### Ambulance Already Assigned
**Scenario:** Trying to assign ambulance that already has `assignedPatient`

**Solution:** Query includes `assignedPatient: null` check

```javascript
const availableAmbulance = await User.findOne({
  role: 'Ambulance',
  status: 'AVAILABLE',
  assignedPatient: null
});
```

## Benefits of Two-Step Approval

### 1. Crew Awareness
- Ambulance crew actively confirms they can take the pickup
- Prevents assignments to crew that may be on break or unavailable

### 2. Real-Time Coordination
- Patient only gets "on the way" notification when crew is actually en route
- More accurate expectation management

### 3. Flexible Assignment
- Receptionist can assign to available ambulance
- Crew can decline if needed (future enhancement)
- System can reassign if crew doesn't respond (future enhancement)

### 4. Better Status Tracking
- Clear distinction between "assigned but pending" vs "actively transporting"
- More granular status for monitoring and reporting

## Future Enhancements

1. **Crew Decline Option:** Allow ambulance to decline pickup request
2. **Auto-Reassignment:** If crew doesn't accept within X minutes, reassign
3. **Crew Notifications:** Push notifications or SMS to crew mobile devices
4. **Patient Tracking:** Real-time map showing ambulance location to patient
5. **Multiple Pickup Options:** Allow crew to see multiple pending requests
6. **Priority Levels:** Emergency vs. routine pickup requests
7. **Estimated Pickup Time:** Calculate and display to patient
8. **Communication Channel:** In-app chat between patient and crew

