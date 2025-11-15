# Patient Transport Workflow Documentation

## Overview
This document describes the complete patient transport workflow implemented in the hospital ICU management system, which coordinates patient pickups via ambulance service.

## Workflow States

### Patient Status Flow
The patient goes through the following status transitions:

1. **null** → Patient has no reservation
2. **RESERVED** → Patient has reserved an ICU room
3. **AWAITING_PICKUP** → Receptionist approved request with ambulance pickup
4. **IN_TRANSIT** → Ambulance has picked up patient and is transporting them
5. **ARRIVED** → Ambulance has arrived at hospital with patient
6. **CHECKED_IN** → Receptionist has checked in the patient to ICU
7. **CHECKED_OUT** → Patient has been discharged

## Step-by-Step Process

### 1. Patient Reserves ICU Room
- Patient browses available ICU rooms on the map
- Patient selects and reserves a room
- Patient status: `null` → `RESERVED`
- ICU status: `Available` → `Occupied`
- ICU is marked as reserved by the patient

**API Endpoint:** `POST /api/receptionist/reserve-icu`

### 2. Receptionist Approves Request

#### Option A: Patient Needs Ambulance Pickup
- Receptionist sees the reservation request in their dashboard
- Receptionist clicks "Approve" button
- Modal appears asking: "Does the patient need ambulance pickup?"
- Receptionist selects "Yes" and enters pickup location
- System finds available ambulance (status = `AVAILABLE`)
- Ambulance is assigned:
  - Ambulance status: `AVAILABLE` → `EN_ROUTE`
  - Ambulance gets: `assignedPatient`, `assignedHospital`, `destination`
- Patient status: `RESERVED` → `AWAITING_PICKUP`
- Patient gets: `assignedAmbulance`, `pickupLocation`, `needsPickup = true`
- Socket.IO event `ambulanceAssigned` is emitted
- Toast notification sent to ambulance crew

**API Endpoint:** `POST /api/receptionist/approve-request`
**Payload:**
```json
{
  "patientId": "patient_id",
  "icuId": "icu_id",
  "needsPickup": true,
  "pickupLocation": "123 Main St, Cairo"
}
```

#### Option B: Patient Coming Directly
- Receptionist selects "No, patient will come directly"
- Patient status remains: `RESERVED`
- Patient can proceed directly to hospital for check-in

### 3. Ambulance Accepts Pickup
- Ambulance crew sees pickup request in their dashboard
- Display shows:
  - Patient ID
  - Pickup location
  - Destination hospital
  - ICU details
- Ambulance clicks "Accept Pickup (Start Transport)"
- Patient status: `AWAITING_PICKUP` → `IN_TRANSIT`
- Socket.IO event `pickupAccepted` is emitted
- GPS tracking starts (demo mode with realistic simulation)

**API Endpoint:** `POST /api/ambulance/:ambulanceId/accept-pickup`
**Payload:**
```json
{
  "patientId": "patient_id"
}
```

### 4. Transport in Progress
- Ambulance status remains: `EN_ROUTE`
- Patient status remains: `IN_TRANSIT`
- Real-time location updates every 15 seconds
- Distance and ETA calculated using Haversine formula
- Receptionist can monitor ambulance progress in real-time
- Socket.IO event `ambulanceStatusUpdate` provides updates

### 5. Ambulance Arrives at Hospital
- Ambulance clicks "Mark Patient Arrived"
- Patient status: `IN_TRANSIT` → `ARRIVED`
- Ambulance status: `EN_ROUTE` → `ARRIVED_HOSPITAL`
- Socket.IO event `patientArrived` is emitted
- Receptionist is notified patient is ready for check-in

**API Endpoint:** `POST /api/ambulance/:ambulanceId/mark-arrived`
**Payload:**
```json
{
  "patientId": "patient_id"
}
```

### 6. Receptionist Checks In Patient
- Receptionist sees patient with "ARRIVED" badge in dashboard
- Receptionist clicks "Direct Check-In" button
- System validates:
  - Patient must have status `ARRIVED` (if came via ambulance)
  - ICU must still be reserved by this patient
- Patient status: `ARRIVED` → `CHECKED_IN`
- Ambulance is freed:
  - Ambulance status: `ARRIVED_HOSPITAL` → `AVAILABLE`
  - Ambulance fields cleared: `assignedPatient`, `assignedHospital`, `destination`, `eta`
- Patient fields cleared: `assignedAmbulance`, `pickupLocation`, `needsPickup`
- ICU timestamp `checkedInAt` is recorded
- Socket.IO event `patientCheckedIn` is emitted

**API Endpoint:** `POST /api/receptionist/check-in`
**Payload:**
```json
{
  "icuId": "icu_id",
  "patientId": "patient_id"
}
```

### 7. Patient Discharge
- When patient is ready to leave, receptionist processes checkout
- Patient status: `CHECKED_IN` → `CHECKED_OUT`
- ICU status: `Occupied` → `Available`
- ICU fields cleared: `reservedBy`, `checkedInAt`
- Patient field cleared: `reservedICU`
- Socket.IO events: `icuUpdated`, `patientCheckedOut`

**API Endpoint:** `POST /api/receptionist/check-out`

## Database Schema Changes

### User Model (Patient Fields)
```javascript
patientStatus: {
  type: String,
  enum: ['RESERVED', 'AWAITING_PICKUP', 'IN_TRANSIT', 'ARRIVED', 'CHECKED_IN', 'CHECKED_OUT'],
  default: null
},
reservedICU: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'ICU'
},
assignedAmbulance: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
},
pickupLocation: {
  type: String
},
needsPickup: {
  type: Boolean,
  default: false
}
```

### User Model (Ambulance Fields)
```javascript
status: {
  type: String,
  enum: ['AVAILABLE', 'EN_ROUTE', 'ARRIVED_HOSPITAL'],
  default: 'AVAILABLE'
},
assignedPatient: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
},
assignedHospital: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Hospital'
},
destination: String,
currentLocation: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    default: [0, 0]
  }
},
eta: Number
```

## Socket.IO Events

### `ambulanceAssigned`
Emitted when receptionist approves request with ambulance pickup.
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
Emitted when ambulance accepts the pickup request.
```javascript
{
  ambulanceId: String,
  patientId: String,
  patientName: String
}
```

### `ambulanceStatusUpdate`
Emitted when ambulance updates location/status/ETA.
```javascript
{
  ambulanceId: String,
  status: String,
  location: { type: 'Point', coordinates: [lng, lat] },
  eta: Number
}
```

### `patientArrived`
Emitted when ambulance marks patient as arrived.
```javascript
{
  ambulanceId: String,
  patientId: String,
  patientName: String,
  hospitalId: String
}
```

### `patientCheckedIn`
Emitted when receptionist checks in patient.
```javascript
{
  icuId: String,
  patientId: String,
  hospitalName: String,
  room: String
}
```

## API Endpoints Summary

### Receptionist Endpoints
- `GET /api/receptionist/icu-requests` - Get pending check-ins (RESERVED + ARRIVED status)
- `POST /api/receptionist/approve-request` - Approve ICU request with optional ambulance
- `POST /api/receptionist/reserve-icu` - Reserve ICU for patient
- `POST /api/receptionist/check-in` - Check in patient to ICU
- `POST /api/receptionist/check-out` - Check out patient from ICU
- `GET /api/receptionist/calculate-fee` - Calculate patient fees

### Ambulance Endpoints
- `GET /api/ambulance` - Get all active ambulances
- `GET /api/ambulance/:ambulanceId` - Get specific ambulance
- `PUT /api/ambulance/:ambulanceId/status` - Update ambulance status
- `POST /api/ambulance/:ambulanceId/assign` - Assign ambulance to patient
- `POST /api/ambulance/:ambulanceId/accept-pickup` - Accept pickup request
- `POST /api/ambulance/:ambulanceId/mark-arrived` - Mark patient as arrived

## Frontend Components

### ReceptionistPanel.jsx
**Features:**
- Display ICU reservation requests
- Approve requests with ambulance pickup option
- Modal for pickup location input
- Monitor EN_ROUTE ambulances in real-time
- Check in patients (including those arriving via ambulance)
- Check out patients
- Status badges showing patient status (AWAITING_PICKUP, IN_TRANSIT, ARRIVED)

**Key Functions:**
- `handleApproveClick()` - Opens approval modal
- `handleApproveSubmit()` - Submits approval with pickup details
- `handleCheckIn()` - Checks in patient
- `handleCheckOut()` - Discharges patient

### AmbulancePanel.jsx
**Features:**
- Display ambulance status and current assignment
- Show active pickup requests
- Accept pickup button (updates patient to IN_TRANSIT)
- Mark arrived button (updates patient to ARRIVED)
- Real-time GPS tracking simulation
- Distance and ETA calculations
- Status update buttons

**Key Functions:**
- `handleAcceptPickup()` - Accept assigned pickup
- `handleMarkArrived()` - Mark patient as arrived at hospital
- `handleStatusUpdate()` - Update ambulance status
- `startGPSTracking()` - Begin location simulation

## Error Handling

### Check-in Validation
- Patient must have status `ARRIVED` if they came via ambulance
- ICU must be reserved by the patient
- Patient must exist and have role 'Patient'
- ICU must exist

### Ambulance Assignment
- At least one ambulance must be available (status = `AVAILABLE`)
- If no ambulance available, request fails with appropriate error message

### Approval Validation
- Patient ID and ICU ID required
- Patient must exist with role 'Patient'
- ICU must exist
- If `needsPickup = true`, pickup location must be provided

## Testing Checklist

- [ ] Patient can reserve ICU room
- [ ] Receptionist sees reservation in dashboard
- [ ] Receptionist can approve with "No pickup" - patient goes to RESERVED
- [ ] Receptionist can approve with "Yes pickup" - patient goes to AWAITING_PICKUP
- [ ] Available ambulance is auto-assigned
- [ ] Ambulance sees pickup request in dashboard
- [ ] Ambulance can accept pickup - patient goes to IN_TRANSIT
- [ ] GPS tracking starts and updates location
- [ ] Receptionist sees real-time ambulance location
- [ ] Ambulance can mark arrived - patient goes to ARRIVED
- [ ] Receptionist sees ARRIVED badge on patient
- [ ] Receptionist can check in ARRIVED patient
- [ ] Ambulance is freed and becomes AVAILABLE again
- [ ] Patient status is CHECKED_IN
- [ ] Receptionist can check out patient
- [ ] ICU becomes Available again

## Future Enhancements

1. **Multiple Ambulance Selection** - Allow receptionist to choose specific ambulance
2. **Patient Notifications** - SMS/Email updates on ambulance status
3. **Route Optimization** - Calculate optimal route from pickup to hospital
4. **Real GPS Integration** - Replace demo mode with actual GPS tracking
5. **Ambulance History** - Track all completed transports
6. **ETA Predictions** - ML-based ETA estimation using traffic data
7. **Push Notifications** - Real-time push notifications for status changes
8. **Patient App** - Mobile app for patients to track their ambulance
9. **Cancelation Flow** - Allow cancelation of pickup requests
10. **Emergency Priority** - Flag urgent pickups with higher priority

## Troubleshooting

### Patient status stuck in AWAITING_PICKUP
- Check if ambulance status is EN_ROUTE
- Verify Socket.IO connection
- Check if ambulance user is logged in
- Verify ambulance sees the pickup request

### Ambulance not showing in receptionist dashboard
- Ensure ambulance status is EN_ROUTE
- Check Socket.IO event listeners
- Verify ambulance data is populated correctly
- Refresh page to reload data

### Check-in fails for ARRIVED patient
- Verify patient status is exactly 'ARRIVED'
- Check if ICU is still reserved by patient
- Verify patient has assignedAmbulance field set
- Check for any validation errors in console

### No available ambulances error
- Check database for ambulance users with status 'AVAILABLE'
- Verify ambulance users have role = 'Ambulance'
- Check if all ambulances are currently assigned
- Create new ambulance user if needed

