# SOFTWARE DESIGN DOCUMENT (SDD)

## SurveyCAD — Digital Land Survey Drawing & Area Calculation Platform

**Document Version:** 1.0
**Document Type:** Software Design Document
**System Type:** Web-Based Surveying and CAD Application
**Primary Users:** Land Surveyors, Civil Engineers, Site Engineers, Students, Field Technicians
**Platform:** Web Browser / Desktop Web Application
**Architecture:** Client-Centric Web Application with Optional Backend Services

---

# 1. DOCUMENT CONTROL

## 1.1 Purpose

This Software Design Document describes the architecture, design, functional behavior, data structures, algorithms, interfaces, security model, performance requirements, testing strategy, deployment architecture, and future development plan for **SurveyCAD**.

SurveyCAD is intended to provide a lightweight, accessible alternative to conventional CAD software for users who primarily need to:

* Draw land/property boundaries.
* Create points and line segments.
* Enter measured distances.
* Enter bearings or angles.
* Work with coordinate points.
* Calculate distances.
* Calculate perimeter.
* Calculate polygon area.
* Convert area between commonly used units.
* Edit survey geometry.
* Annotate drawings.
* Save and reopen survey projects.
* Generate printable survey drawings and reports.
* Export survey information for use in other applications.

The system is deliberately focused on surveying-related workflows rather than attempting to reproduce every feature of a professional CAD platform.

---

# 2. SYSTEM OBJECTIVES

## 2.1 Primary Objective

The primary objective is to provide a simple digital workspace in which a surveyor can create a land boundary from measured survey data and immediately obtain geometric measurements such as:

* Side lengths
* Total perimeter
* Enclosed area
* Coordinates
* Bearings
* Angles
* Area conversions

The system should minimize the amount of manual calculation required from the surveyor.

---

## 2.2 Secondary Objectives

The system should:

1. Reduce repetitive manual calculations.
2. Provide a visual representation of survey measurements.
3. Allow correction of incorrectly entered measurements.
4. Maintain numerical precision internally.
5. Provide clear distinction between drawing scale and actual measurements.
6. Support multiple measurement units.
7. Allow projects to be saved.
8. Provide printable documentation.
9. Work without requiring a powerful computer.
10. Provide a clean interface that can be learned quickly.

---

# 3. PROBLEM STATEMENT

Many survey workflows involve collecting measurements in the field and subsequently transferring them into CAD or manually calculating areas.

Traditional CAD applications provide extensive functionality, but they may be:

* Expensive.
* Complex for non-CAD users.
* Overpowered for basic surveying workflows.
* Difficult for occasional users to learn.
* Dependent on specific desktop installations.

SurveyCAD addresses this by providing a purpose-built interface.

Instead of requiring a user to understand a complete CAD environment, the user should be able to perform a workflow such as:

```text
Create Project
      ↓
Add Survey Points
      ↓
Enter Coordinates / Distances / Bearings
      ↓
Generate Boundary
      ↓
Close Polygon
      ↓
Calculate Area
      ↓
Review Measurements
      ↓
Annotate Drawing
      ↓
Export Drawing / Report
```

---

# 4. SCOPE

## 4.1 In Scope

The first major version includes:

### Geometry

* Point creation
* Line creation
* Polyline creation
* Polygon creation
* Polygon closure
* Vertex editing
* Vertex deletion
* Vertex insertion
* Object selection
* Object movement
* Zoom
* Pan
* Grid
* Snap functionality

### Survey Measurements

* Distance
* Bearing
* Azimuth
* Interior angle
* Coordinates
* Perimeter
* Area

### Units

Linear units:

* metre
* centimetre
* millimetre
* feet
* inches

Area units:

* square metre
* square foot
* acre
* hectare
* cent
* square yard

### Data

* Project creation
* Project saving
* Project loading
* Point table
* Measurement table
* Project metadata

### Export

* PDF
* CSV
* JSON
* Image
* Survey report

### Annotation

* Point labels
* Distance labels
* Area labels
* Text annotations
* North arrow
* Scale indicator

---

# 5. OUT OF SCOPE FOR INITIAL VERSION

The following are not mandatory for Version 1:

* Full AutoCAD DWG compatibility.
* Professional total-station integration.
* GNSS receiver integration.
* Legal cadastral certification.
* Automated government land-record verification.
* Satellite positioning correction.
* Professional-grade photogrammetry.
* 3D terrain modelling.
* BIM.
* Structural design.
* Building information modelling.
* Automated legal boundary determination.

These can be considered for future versions.

---

# 6. USERS AND ROLES

## 6.1 Surveyor

Primary user.

Capabilities:

* Create projects.
* Enter survey data.
* Draw boundaries.
* Calculate areas.
* Edit measurements.
* Generate reports.
* Export data.

---

## 6.2 Engineer

Capabilities:

* Review survey drawings.
* Inspect measurements.
* Add annotations.
* Export reports.
* Validate calculations.

---

## 6.3 Student

Capabilities:

* Practice surveying.
* Create sample boundaries.
* Perform area calculations.
* Learn coordinate geometry.

---

## 6.4 Administrator

For future cloud version.

Capabilities:

* Manage users.
* Manage projects.
* Monitor storage.
* Configure system settings.
* Review application logs.

---

# 7. SYSTEM REQUIREMENTS

## 7.1 Hardware Requirements

Minimum:

* Dual-core processor
* 4 GB RAM
* 500 MB available storage
* Display resolution of at least 1280 × 720
* Mouse recommended for precise drawing

Recommended:

* 8 GB RAM or greater
* Modern Intel/AMD processor
* 1920 × 1080 display
* Mouse with scroll wheel

---

# 8. SOFTWARE REQUIREMENTS

## 8.1 Client

Supported browsers:

* Google Chrome
* Microsoft Edge
* Mozilla Firefox
* Safari

Recommended:

* Latest Chrome or Edge.

---

# 9. HIGH-LEVEL ARCHITECTURE

SurveyCAD follows a layered architecture.

```text
┌───────────────────────────────────────┐
│             USER INTERFACE            │
│ Toolbar / Canvas / Panels / Tables   │
└───────────────────┬───────────────────┘
                    │
┌───────────────────▼───────────────────┐
│         APPLICATION CONTROLLER        │
│ Commands / Selection / Tools / State  │
└───────────────────┬───────────────────┘
                    │
┌───────────────────▼───────────────────┐
│           GEOMETRY ENGINE             │
│ Points / Lines / Polygons / Transform │
└───────────────────┬───────────────────┘
                    │
┌───────────────────▼───────────────────┐
│         SURVEY CALCULATION ENGINE     │
│ Distance / Bearing / Area / Perimeter │
└───────────────────┬───────────────────┘
                    │
┌───────────────────▼───────────────────┐
│            DATA MANAGEMENT             │
│ Project / Measurements / Metadata     │
└───────────────────┬───────────────────┘
                    │
┌───────────────────▼───────────────────┐
│        STORAGE / EXPORT LAYER         │
│ JSON / CSV / PDF / Image / Database  │
└───────────────────────────────────────┘
```

---

# 10. FRONT-END ARCHITECTURE

A recommended implementation is:

```text
React
  │
  ├── UI Components
  ├── Toolbar
  ├── Property Panel
  ├── Measurement Table
  ├── Project Manager
  │
  └── Canvas Engine
        │
        ├── Geometry Renderer
        ├── Selection Engine
        ├── Snap Engine
        └── Interaction Engine
```

A canvas rendering system such as SVG or HTML Canvas may be used.

For the first implementation, **SVG is recommended** because:

* Geometry is naturally represented as vectors.
* Individual points can be selected.
* Lines can be edited.
* Labels can be attached to geometry.
* Export to SVG/PDF is convenient.
* Scaling is straightforward.

For very large drawings, Canvas/WebGL can later be considered.

---

# 11. BACK-END ARCHITECTURE

The first version can operate without a mandatory backend.

### Local-first architecture:

```text
Browser
  │
  ├── Application
  ├── Geometry Engine
  ├── Calculation Engine
  └── Local Project Storage
```

A backend can be introduced later:

```text
Browser
   │
   ▼
REST API
   │
   ├── Authentication
   ├── Project Service
   ├── Export Service
   └── User Service
   │
   ▼
Database
```

---

# 12. CORE DATA MODEL

## 12.1 Project

```json
{
  "id": "project-001",
  "name": "Property Survey",
  "description": "Residential property boundary",
  "createdAt": "2026-09-16T10:00:00Z",
  "updatedAt": "2026-09-16T10:30:00Z",
  "units": {
    "distance": "m",
    "area": "m2"
  },
  "points": [],
  "objects": [],
  "annotations": []
}
```

---

# 13. POINT DATA STRUCTURE

Each survey point should contain:

```json
{
  "id": "P001",
  "label": "A",
  "x": 100.250,
  "y": 200.750,
  "elevation": null
}
```

Optional properties:

```text
point type
description
survey code
timestamp
source
accuracy
```

---

# 14. LINE DATA STRUCTURE

```json
{
  "id": "L001",
  "type": "line",
  "startPoint": "P001",
  "endPoint": "P002"
}
```

Calculated properties:

```text
length
bearing
azimuth
```

These should preferably be calculated dynamically rather than stored as the primary source of truth.

---

# 15. POLYGON DATA STRUCTURE

```json
{
  "id": "POLY001",
  "type": "polygon",
  "points": [
    "P001",
    "P002",
    "P003",
    "P004"
  ],
  "closed": true
}
```

---

# 16. ANNOTATION DATA STRUCTURE

```json
{
  "id": "A001",
  "type": "distance",
  "text": "25.40 m",
  "position": {
    "x": 150,
    "y": 220
  },
  "referenceObject": "L001"
}
```

---

# 17. USER INTERFACE DESIGN

The main interface should contain:

```text
┌─────────────────────────────────────────────────────┐
│ File   Edit   View   Survey   Calculate   Export    │
├─────────────────────────────────────────────────────┤
│ Select | Point | Line | Polygon | Measure | Text    │
├─────────────┬───────────────────────────┬───────────┤
│             │                           │           │
│ Properties  │       DRAWING CANVAS      │  Survey   │
│             │                           │  Data     │
│             │                           │           │
│             │                           │           │
├─────────────┴───────────────────────────┴───────────┤
│ Status: 4 Points | Area: 1250.42 m² | Scale: 1:500 │
└─────────────────────────────────────────────────────┘
```

---

# 18. TOOLBAR

The toolbar should provide:

1. Select
2. Point
3. Line
4. Polyline
5. Polygon
6. Measure distance
7. Measure angle
8. Add text
9. Add dimension
10. Pan
11. Zoom
12. Undo
13. Redo

---

# 19. POINT TOOL

The point tool allows the surveyor to create a point.

Two modes should be supported.

### Graphical mode

User clicks the canvas.

```text
Click → Point created
```

### Coordinate mode

User enters:

```text
Point: A
X: 125.50
Y: 250.75
```

The system places the point at the corresponding coordinate.

---

# 20. LINE TOOL

The line tool creates a line between two points.

Workflow:

```text
Select Line
      ↓
Select Point A
      ↓
Select Point B
      ↓
Line created
      ↓
Length calculated
      ↓
Bearing calculated
```

---

# 21. DISTANCE ENTRY

The user should be able to enter exact measurements.

Example:

```text
Start Point: A
Distance: 25.40 m
Bearing: 45°00'00"
```

The system calculates the destination coordinate.

For a conventional azimuth measured clockwise from north:

```text
ΔX = d × sin(θ)

ΔY = d × cos(θ)
```

where:

```text
d = distance
θ = azimuth
```

Therefore:

```text
X₂ = X₁ + d sin(θ)

Y₂ = Y₁ + d cos(θ)
```

The coordinate convention must be explicitly documented and configurable.

---

# 22. BEARING SYSTEM

The application should support:

* Azimuth
* Whole-circle bearing
* Quadrant bearing

Example:

```text
45°00'00"
```

or:

```text
N 45° E
```

Conversion functions should normalize angles to:

```text
0° ≤ θ < 360°
```

---

# 23. ANGLE ENTRY

The system should support:

```text
Decimal degrees
Degrees/minutes/seconds
Radians
```

Example:

```text
45.25°
```

Equivalent:

```text
45°15'00"
```

---

# 24. DISTANCE CALCULATION

For Cartesian coordinates:

```text
d = √((x₂-x₁)² + (y₂-y₁)²)
```

The system should retain high internal precision.

Display precision can be configurable:

```text
0
1
2
3
4
5
6 decimal places
```

---

# 25. PERIMETER CALCULATION

For polygon vertices:

```text
P1 → P2 → P3 → ... → Pn → P1
```

The perimeter is:

```text
Perimeter =
d(P1,P2) +
d(P2,P3) +
...
d(Pn,P1)
```

---

# 26. AREA CALCULATION

For coordinate-based polygons, the recommended primary algorithm is the **Shoelace Formula**.

For:

```text
(x1,y1)
(x2,y2)
...
(xn,yn)
```

Area:

```text
A =
1/2 | Σ(xᵢyᵢ₊₁ - xᵢ₊₁yᵢ) |
```

with:

```text
xₙ₊₁ = x₁
yₙ₊₁ = y₁
```

---

# 27. AREA CONVERSION

The internal calculation should use a canonical unit, preferably square metres.

Example:

```text
1 acre = 4046.8564224 m²
```

The conversion layer should support configurable unit definitions.

Common Indian land units should include:

```text
1 cent
1 acre
1 hectare
square metre
square feet
square yard
```

The application must clearly identify regional/custom units because local land-measurement terminology can vary.

---

# 28. CENT CALCULATION

For the commonly used Indian definition:

```text
1 cent = 1/100 acre
```

Therefore:

```text
1 cent ≈ 40.468564224 m²
```

and:

```text
1 cent = 435.6 sq ft
```

The application should display the exact conversion used in the project settings.

---

# 29. AREA RESULT PANEL

When a polygon is closed:

```text
┌────────────────────────────┐
│ AREA                       │
│                            │
│ 1,250.42 m²                │
│ 13,456.12 ft²              │
│ 0.309 acres                │
│ 30.90 cents                │
│                            │
│ PERIMETER                  │
│ 145.30 m                   │
└────────────────────────────┘
```

---

# 30. POLYGON CLOSURE

A polygon should be considered valid only when:

```text
Number of vertices >= 3
```

The user can close the polygon by:

* Clicking the starting point.
* Selecting "Close Polygon."
* Using a keyboard shortcut.

Once closed:

```text
Pₙ → P₁
```

is automatically created as the closing edge.

---

# 31. SELF-INTERSECTION DETECTION

The system should detect self-intersecting polygons.

Example:

```text
A──────B
 \    /
  \  /
  /  \
 /    \
C──────D
```

If polygon edges cross, the application should display:

```text
Warning:
Boundary contains intersecting segments.
Area calculation may be invalid.
```

The system should not silently provide a misleading area.

---

# 32. GEOMETRY VALIDATION

Before calculating area, validate:

1. Minimum 3 vertices.
2. Polygon is closed.
3. No invalid coordinates.
4. No duplicate consecutive vertices.
5. No self-intersections.
6. Non-zero area.
7. Valid numerical values.

---

# 33. SNAP SYSTEM

The snapping system is important for precision.

Supported snap types:

* Endpoint
* Midpoint
* Grid
* Point
* Intersection
* Perpendicular
* Nearest

Example:

```text
Cursor approaches Point A
        ↓
Snap threshold reached
        ↓
Cursor locks to A
        ↓
Line begins exactly at A
```

---

# 34. GRID SYSTEM

The canvas should provide configurable grids.

Options:

```text
1 m
5 m
10 m
25 m
50 m
100 m
```

The grid should automatically scale with zoom.

---

# 35. COORDINATE SYSTEM

The application should initially support a local Cartesian coordinate system:

```text
X = Easting
Y = Northing
```

Example:

```text
A = (1000.000, 2000.000)
B = (1025.500, 2000.000)
```

Future versions may support:

* UTM
* Latitude/Longitude
* EPSG coordinate reference systems
* Local grid systems

---

# 36. COORDINATE TABLE

A dedicated table should display:

| Point | Easting/X | Northing/Y | Elevation |
| ----- | --------: | ---------: | --------: |
| A     |  1000.000 |   2000.000 |         — |
| B     |  1025.500 |   2000.000 |         — |
| C     |  1025.500 |   2020.000 |         — |
| D     |  1000.000 |   2020.000 |         — |

Selecting a row should highlight the corresponding point.

---

# 37. SURVEY LINE TABLE

| Line | From | To | Distance | Bearing |
| ---- | ---- | -- | -------: | ------: |
| L1   | A    | B  |  25.50 m |     90° |
| L2   | B    | C  |  20.00 m |      0° |
| L3   | C    | D  |  25.50 m |    270° |
| L4   | D    | A  |  20.00 m |    180° |

---

# 38. PROPERTY PANEL

When an object is selected:

```text
Selected Object
────────────────
Type: Line

Start: A
End: B

Length:
25.500 m

Bearing:
90°00'00"

Azimuth:
90.000°
```

The property panel should allow editable values where appropriate.

---

# 39. DIRECT GEOMETRY EDITING

The user should be able to:

* Drag vertices.
* Enter exact coordinates.
* Change distance.
* Change bearing.
* Delete vertices.
* Add vertices.

Whenever geometry changes:

```text
Geometry
   ↓
Calculation Engine
   ↓
Area / perimeter / measurements
   ↓
UI update
```

---

# 40. UNDO / REDO

All meaningful modifications should create commands.

Example:

```text
Add Point
Add Line
Move Point
Delete Point
Change Coordinate
Close Polygon
Add Annotation
```

Command history:

```text
Command 1
Command 2
Command 3
...
```

Undo reverses the latest command.

Redo reapplies it.

---

# 41. PROJECT MANAGEMENT

The user should be able to:

```text
New Project
Open Project
Save Project
Save As
Rename Project
Duplicate Project
Delete Project
```

Project metadata:

```text
Project Name
Surveyor
Client
Property Name
Location
Date
Description
Units
Coordinate System
Notes
```

---

# 42. LOCAL STORAGE

For the initial offline-first implementation, browser storage can be used.

Recommended structure:

```text
IndexedDB
   │
   ├── projects
   ├── drawings
   ├── settings
   └── recentProjects
```

IndexedDB is preferred over simple local storage for larger projects.

---

# 43. PROJECT FILE FORMAT

A custom JSON-based format should be used.

Example:

```json
{
  "format": "SurveyCAD",
  "version": "1.0",
  "project": {
    "name": "Sample Property",
    "units": "metric"
  },
  "points": [
    {
      "id": "P1",
      "x": 0,
      "y": 0
    },
    {
      "id": "P2",
      "x": 25,
      "y": 0
    }
  ],
  "objects": [],
  "annotations": []
}
```

---

# 44. CSV IMPORT

Users should be able to import survey point data.

Example CSV:

```csv
Point,Easting,Northing
A,1000.000,2000.000
B,1025.500,2000.000
C,1025.500,2020.000
D,1000.000,2020.000
```

The import wizard should allow column mapping.

---

# 45. CSV EXPORT

Export:

```text
Point
X/Easting
Y/Northing
Elevation
Description
```

---

# 46. DRAWING EXPORT

Supported exports:

### PNG

For quick sharing.

### SVG

For vector graphics.

### PDF

For printable documentation.

### JSON

For project backup.

### CSV

For measurement data.

---

# 47. PDF REPORT

A generated report should contain:

```text
SURVEY REPORT

Project:
Residential Property Survey

Surveyor:
________________

Date:
________________

────────────────────

PROPERTY SUMMARY

Area:
1250.42 m²

Perimeter:
145.30 m

────────────────────

POINT TABLE

A ...
B ...
C ...
D ...

────────────────────

LINE TABLE

AB ...
BC ...
CD ...
DA ...

────────────────────

DRAWING

[Survey Drawing]

────────────────────

NOTES

...
```

---

# 48. DRAWING SHEET

The printable drawing should contain:

* Project title
* Property name
* Survey date
* Drawing
* North arrow
* Scale
* Point labels
* Boundary dimensions
* Area
* Perimeter
* Notes
* Legend
* Revision information

---

# 49. SCALE

The application must distinguish between:

### World coordinates

Actual survey dimensions.

### Screen coordinates

Pixels used for rendering.

The drawing must never use screen pixels as the source of measurement.

For example:

```text
Screen:
500 pixels

Actual:
25 metres
```

The scale transformation handles the relationship.

---

# 50. VIEWPORT SYSTEM

The viewport maintains:

```text
zoom
panX
panY
scale
```

World-to-screen transformation:

```text
screenX = worldX × scale + panX
screenY = -worldY × scale + panY
```

The Y-axis inversion depends on the rendering coordinate system.

---

# 51. ZOOM

Zoom should support:

* Mouse wheel
* Zoom in
* Zoom out
* Zoom extents
* Zoom selected
* Zoom drawing

Zoom should be centered around the cursor where possible.

---

# 52. PAN

Pan should support:

* Middle mouse button
* Space + drag
* Dedicated pan tool

On touch devices:

* One-finger interaction for drawing.
* Two-finger pan/zoom where appropriate.

---

# 53. MEASUREMENT TOOL

The measurement tool allows temporary measurements without permanently adding geometry.

Workflow:

```text
Measure
 ↓
Click A
 ↓
Click B
 ↓
Distance displayed
 ↓
Bearing displayed
```

Example:

```text
Distance: 28.52 m
Bearing: 137°14'32"
```

---

# 54. AREA MEASUREMENT TOOL

The user can temporarily click points:

```text
A → B → C → D → A
```

The application calculates:

```text
Area
Perimeter
```

The measurement can optionally be converted into a permanent polygon.

---

# 55. DIMENSION LABELS

Dimensions should be automatically generated.

Example:

```text
        25.40 m
A ───────────────── B
│                    │
│                    │ 20.00 m
│                    │
D ───────────────── C
        25.40 m
```

Labels should update automatically when geometry changes.

---

# 56. NORTH ARROW

The drawing should support a configurable north direction.

Default:

```text
North = +Y
```

Future versions may allow arbitrary rotation.

---

# 57. AREA LABEL

Inside a closed polygon:

```text
AREA
1250.42 m²
30.88 cents
```

The label position should be calculated automatically but remain movable.

---

# 58. ERROR HANDLING

The application should never display:

```text
NaN
Infinity
undefined
```

for a normal user operation.

Instead:

```text
Unable to calculate area.
Please ensure the polygon contains at least three valid points.
```

---

# 59. VALIDATION RULES

## Point

```text
X must be numeric.
Y must be numeric.
```

## Distance

```text
Distance > 0
```

## Polygon

```text
vertices >= 3
area > tolerance
```

## Bearing

```text
0° <= bearing < 360°
```

---

# 60. NUMERICAL PRECISION

Internal calculations should use JavaScript's double-precision floating-point arithmetic or an appropriate high-precision numerical library where necessary.

The system should:

* Preserve raw coordinates.
* Avoid premature rounding.
* Round only for display/export where configured.

Example:

Internal:

```text
25.493827165
```

Display:

```text
25.49 m
```

---

# 61. AREA VALIDATION

Area results should be cross-checkable.

For simple rectangles:

```text
Area = length × width
```

For arbitrary polygons:

```text
Shoelace formula
```

Testing should compare expected results against known geometries.

---

# 62. CLOSURE ERROR

When survey measurements are entered as traverses, the system should eventually support closure analysis.

For a closed traverse:

```text
ΣΔX ≈ 0
ΣΔY ≈ 0
```

Closure error:

```text
e = √((ΣΔX)² + (ΣΔY)²)
```

Relative precision:

```text
Precision = Total traverse length / Closure error
```

The application can report:

```text
Closure Error: 0.032 m
Relative Precision: 1:8420
```

This feature should be clearly identified as a computational surveying aid, not a substitute for professional surveying standards.

---

# 63. TRAVERSE MODULE

Future/advanced functionality:

```text
Start Point
   ↓
Bearing + Distance
   ↓
Next Point
   ↓
Bearing + Distance
   ↓
Next Point
   ↓
...
   ↓
Closure
```

Input:

```text
A → 25.50m @ 45°
B → 30.20m @ 90°
C → 20.10m @ 180°
D → ...
```

System computes coordinates.

---

# 64. TRAVERSE TABLE

| Station | Bearing | Distance |     ΔE |     ΔN |
| ------- | ------: | -------: | -----: | -----: |
| A-B     |     45° |    25.50 | +18.03 | +18.03 |
| B-C     |     90° |    30.20 | +30.20 |      0 |
| C-D     |    180° |    20.10 |      0 | -20.10 |

---

# 65. BALANCING / ADJUSTMENT

An advanced version may implement:

* Bowditch adjustment.
* Transit rule.
* Least-squares adjustment.

These should be disabled by default and explicitly documented.

---

# 66. RESPONSIVE DESIGN

The application should support:

### Desktop

Three-panel interface.

### Tablet

Canvas + collapsible properties.

### Mobile

Simplified interface.

Desktop is the primary target because precise survey drawing is considerably easier with a mouse.

---

# 67. ACCESSIBILITY

The system should provide:

* Keyboard navigation.
* Visible focus states.
* Tooltips.
* Text alternatives.
* Accessible labels.
* Sufficient contrast.
* Keyboard shortcuts.

---

# 68. KEYBOARD SHORTCUTS

Suggested shortcuts:

```text
Esc       Cancel current operation
Delete    Delete selection
Ctrl+Z    Undo
Ctrl+Y    Redo
Ctrl+S    Save
Ctrl+O    Open
Ctrl+N    New project
P         Point
L         Line
G         Polygon
M         Measure
T         Text
Space     Pan
F         Fit drawing
```

---

# 69. SECURITY

For local-only operation:

* No user authentication is required.
* Projects remain on the user's device.
* No survey data is transmitted.

For cloud version:

* Authentication required.
* HTTPS mandatory.
* Password hashing.
* Session management.
* Access control.
* Project ownership.
* Server-side validation.
* Rate limiting.
* Audit logs.

---

# 70. PRIVACY

Survey information can be sensitive because property drawings may contain:

* Property dimensions.
* Location information.
* Client information.
* Coordinates.

Therefore the default architecture should preferably be **local-first**.

Cloud synchronization should be opt-in.

---

# 71. BACKUP

The application should provide:

```text
Export Project
```

which produces:

```text
project-name.surveycad
```

The file should contain all geometry and metadata.

The user can restore it later.

---

# 72. AUTOSAVE

Autosave should occur after significant modifications.

Example:

```text
User changes point
        ↓
Debounce
        ↓
Save project state
```

The system should display:

```text
Saved
```

or:

```text
Saving...
```

---

# 73. RECOVERY

If the browser closes unexpectedly:

```text
SurveyCAD reopened
        ↓
Recovery detected
        ↓
Restore unsaved project?
```

The user should be able to recover the latest autosaved state.

---

# 74. COMMAND ARCHITECTURE

Use the Command Pattern.

Example:

```text
Command
 ├── execute()
 └── undo()
```

Commands:

```text
CreatePointCommand
DeletePointCommand
MovePointCommand
CreateLineCommand
CreatePolygonCommand
UpdateMeasurementCommand
AddAnnotationCommand
```

This makes Undo/Redo reliable.

---

# 75. EVENT SYSTEM

Core events:

```text
POINT_CREATED
POINT_UPDATED
POINT_DELETED

LINE_CREATED
LINE_UPDATED
LINE_DELETED

POLYGON_CREATED
POLYGON_UPDATED
POLYGON_CLOSED

SELECTION_CHANGED

PROJECT_SAVED
PROJECT_LOADED

UNIT_CHANGED
```

---

# 76. STATE MANAGEMENT

Application state:

```text
Project State
View State
Selection State
Tool State
History State
Settings State
```

Example:

```javascript
{
  activeTool: "polygon",
  selectedObjects: ["P001"],
  zoom: 1.25,
  pan: {
    x: 20,
    y: 40
  }
}
```

---

# 77. GEOMETRY ENGINE

The geometry engine should be independent of the UI.

It should expose functions such as:

```text
distance()
bearing()
azimuth()
polygonArea()
polygonPerimeter()
centroid()
lineIntersection()
pointToLineDistance()
isPointInsidePolygon()
polygonSelfIntersects()
```

This separation is extremely important.

The UI should not perform geometry calculations directly.

---

# 78. CALCULATION ENGINE

The calculation engine consumes geometry.

Example:

```text
Geometry
   ↓
Calculation Engine
   ↓
Measurement Result
```

Output:

```json
{
  "areaM2": 1250.4234,
  "perimeterM": 145.3021,
  "areaSqFt": 13459.0,
  "areaAcres": 0.3089
}
```

---

# 79. RENDERING ENGINE

The renderer receives world geometry and converts it to screen geometry.

```text
World coordinates
       ↓
Viewport transformation
       ↓
Screen coordinates
       ↓
SVG/Canvas renderer
```

The renderer must never modify the actual survey data.

---

# 80. SELECTION ENGINE

Selection methods:

* Click.
* Rectangle selection.
* Point selection.
* Object selection.

Selection state should be independent from geometry state.

---

# 81. HIT TESTING

For selecting lines:

Calculate distance between cursor and line segment.

If:

```text
distance < tolerance
```

then select the line.

Tolerance should scale according to zoom.

---

# 82. PROJECT VERSIONING

Every project should have:

```text
formatVersion
```

Example:

```json
"formatVersion": "1.0"
```

Future versions can migrate older project files.

---

# 83. LOGGING

Development logging:

```text
INFO
WARN
ERROR
DEBUG
```

Production should avoid logging sensitive survey information unnecessarily.

---

# 84. PERFORMANCE REQUIREMENTS

For normal projects:

* UI response < 100 ms for common interactions.
* Measurement updates should feel instantaneous.
* Zoom/pan should remain smooth.
* Saving should not freeze the interface.

Target:

```text
10,000 points
1,000 polygons
```

should remain usable on a modern laptop, subject to rendering implementation.

---

# 85. TESTING STRATEGY

Testing should occur at multiple levels.

## Unit Tests

Test:

```text
distance()
bearing()
area()
perimeter()
unit conversion()
intersection detection()
```

---

# 86. GEOMETRY TEST CASES

### Rectangle

Coordinates:

```text
(0,0)
(10,0)
(10,20)
(0,20)
```

Expected:

```text
Area = 200 m²
Perimeter = 60 m
```

### Triangle

```text
(0,0)
(10,0)
(0,10)
```

Expected:

```text
Area = 50 m²
```

---

# 87. NEGATIVE TESTS

Test:

* Empty polygon.
* Two-point polygon.
* Duplicate points.
* Self-intersecting polygon.
* Zero-area polygon.
* Invalid coordinates.
* Negative distances.
* Invalid bearing.
* Extremely large coordinates.

---

# 88. UI TESTING

Test:

* Toolbar.
* Point creation.
* Line creation.
* Polygon creation.
* Editing.
* Undo.
* Redo.
* Saving.
* Loading.
* Export.

---

# 89. EXPORT TESTING

Verify:

```text
PDF geometry
CSV values
JSON integrity
PNG rendering
```

Exported measurements must match the calculation engine.

---

# 90. DATA INTEGRITY

The system should have a single source of truth.

Recommended:

```text
Coordinates
   ↓
Derived geometry
   ↓
Calculated measurements
```

Do not store conflicting values such as:

```text
Coordinate
+
manually stored distance
```

unless the distance represents an explicitly entered field measurement.

---

# 91. MEASURED VS CALCULATED DATA

This distinction is important.

Example:

```text
Measured distance:
25.43 m
```

versus:

```text
Coordinate-derived distance:
25.429812 m
```

The application should distinguish these.

Data model:

```text
measurementSource:
  "field"
  "calculated"
  "user-entered"
```

---

# 92. SURVEY DATA CONFIDENCE

Optional metadata:

```text
Measurement
Accuracy
Source
Instrument
Date
Operator
```

This allows future integration with professional survey workflows.

---

# 93. IMPORT WORKFLOW

```text
Import CSV
    ↓
Preview data
    ↓
Map columns
    ↓
Validate rows
    ↓
Show errors
    ↓
Import
    ↓
Create points
```

Example error:

```text
Row 12:
Invalid Northing value.
```

---

# 94. EXPORT WORKFLOW

```text
Export
 ↓
Choose format
 ↓
Choose units
 ↓
Choose precision
 ↓
Generate
 ↓
Save file
```

---

# 95. PRINT WORKFLOW

```text
Print
 ↓
Page size
 ↓
Orientation
 ↓
Scale
 ↓
Margins
 ↓
Preview
 ↓
Export PDF
```

---

# 96. SCALE MANAGEMENT

The user can choose:

```text
Fit to page
1:50
1:100
1:200
1:500
1:1000
Custom
```

The actual survey geometry remains unchanged.

---

# 97. REPORT GENERATION ARCHITECTURE

```text
Project
   ↓
Report Generator
   ├── Metadata
   ├── Point Table
   ├── Line Table
   ├── Area
   ├── Perimeter
   └── Drawing
   ↓
PDF
```

---

# 98. ERROR MESSAGES

Messages should be understandable.

Bad:

```text
ERR_GEO_004
```

Better:

```text
This polygon cannot be calculated because two boundary lines intersect.
```

---

# 99. CONFIRMATION DIALOGUES

Potentially destructive actions:

```text
Delete project?
Delete selected points?
Clear drawing?
```

must require confirmation where appropriate.

---

# 100. INTERNATIONALIZATION

Future support:

```text
English
Malayalam
Hindi
Tamil
Kannada
```

All UI strings should be externalized.

---

# 101. CONFIGURATION

User settings:

```text
Distance unit
Area unit
Decimal precision
Angle format
Bearing format
Grid spacing
Snap tolerance
Theme
Language
Autosave
```

---

# 102. THEMING

Support:

```text
Light
Dark
System
```

The canvas should remain highly readable in both modes.

---

# 103. FUTURE GPS INTEGRATION

A future version could import:

```text
Latitude
Longitude
```

and convert them into a projected coordinate system.

The system should not assume raw latitude/longitude distances are equivalent to planar metres.

A proper coordinate reference system transformation would be required.

---

# 104. FUTURE TOTAL STATION INTEGRATION

Potential architecture:

```text
Total Station
      ↓
Data Import
      ↓
Point Parser
      ↓
SurveyCAD
```

Potential formats:

```text
CSV
TXT
DXF
LandXML
```

depending on device support.

---

# 105. FUTURE DXF SUPPORT

A future version may support:

```text
SurveyCAD
   ↓
DXF Export
   ↓
AutoCAD / Other CAD Software
```

This would make the application useful even when professional CAD software is used later.

---

# 106. FUTURE GIS SUPPORT

Potential formats:

```text
GeoJSON
KML
Shapefile
GeoPackage
```

This would allow integration with GIS workflows.

---

# 107. FUTURE MAP BACKGROUND

Optional map background:

```text
Satellite imagery
Street map
Topographic map
```

The map layer must be treated separately from the actual survey geometry.

---

# 108. ARCHITECTURE FOR FUTURE CLOUD VERSION

```text
                    ┌─────────────┐
                    │   Browser   │
                    └──────┬──────┘
                           │
                         HTTPS
                           │
                    ┌──────▼──────┐
                    │ API Gateway │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     Project API      User API        Export API
          │                │                │
          └────────────────┼────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Database   │
                    └─────────────┘
```

---

# 109. DATABASE DESIGN

Possible relational structure:

```text
users
projects
points
objects
measurements
annotations
project_members
```

Relationships:

```text
User
  │
  └── Projects
        │
        ├── Points
        ├── Objects
        ├── Measurements
        └── Annotations
```

---

# 110. API DESIGN

Example:

```http
POST /api/projects
GET /api/projects
GET /api/projects/:id
PUT /api/projects/:id
DELETE /api/projects/:id
```

Points:

```http
POST /api/projects/:id/points
PUT /api/projects/:id/points/:pointId
DELETE /api/projects/:id/points/:pointId
```

Exports:

```http
POST /api/projects/:id/export/pdf
POST /api/projects/:id/export/csv
```

---

# 111. AUTHENTICATION

Future cloud system:

```text
Register
 ↓
Login
 ↓
Access Token
 ↓
API
```

OAuth providers may eventually be supported.

---

# 112. AUTHORIZATION

Users should only be able to access projects they own or have permission to access.

Roles:

```text
Owner
Editor
Viewer
```

---

# 113. AUDIT TRAIL

For professional/cloud use:

```text
Who
What
When
```

Example:

```text
User changed Point B
16 Sep 2026 15:42
Old: (25.2, 30.1)
New: (25.4, 30.1)
```

---

# 114. DEVELOPMENT PHASES

## Phase 1 — Geometry Core

Implement:

* Coordinate system.
* Point.
* Line.
* Polygon.
* Distance.
* Area.
* Perimeter.

---

## Phase 2 — Drawing Interface

Implement:

* Canvas.
* Toolbar.
* Selection.
* Zoom.
* Pan.
* Grid.
* Snap.

---

## Phase 3 — Survey Tools

Implement:

* Bearing.
* Azimuth.
* Exact distance.
* Coordinate entry.
* Traverse.

---

## Phase 4 — Project Management

Implement:

* Save.
* Load.
* Autosave.
* Import.
* Export.

---

## Phase 5 — Reporting

Implement:

* PDF.
* Tables.
* Drawing sheet.
* Dimension labels.

---

## Phase 6 — Advanced Surveying

Implement:

* Closure analysis.
* Traverse adjustment.
* Coordinate systems.
* DXF.
* GeoJSON.

---

# 115. MVP DEFINITION

The minimum viable product should contain:

```text
✓ Canvas
✓ Point tool
✓ Line tool
✓ Polygon tool
✓ Coordinate entry
✓ Distance calculation
✓ Area calculation
✓ Perimeter calculation
✓ Unit conversion
✓ Point table
✓ Undo/Redo
✓ Save project
✓ Load project
✓ PDF export
```

The MVP should NOT attempt to reproduce AutoCAD.

---

# 116. RECOMMENDED MVP WORKFLOW

A surveyor opens the application.

```text
New Project
```

Enters:

```text
Project:
Property A

Unit:
metres

Area:
square metres
```

Then selects:

```text
Survey → Traverse
```

Enters:

```text
Point A
Easting = 1000
Northing = 2000

Distance = 25.4m
Bearing = 90°
```

The system calculates Point B.

Then:

```text
B → C
C → D
D → A
```

The polygon closes.

The system immediately displays:

```text
Area
Perimeter
Coordinates
Boundary lengths
Bearings
```

The user clicks:

```text
Export → Survey Report
```

and receives a PDF.

---

# 117. DESIGN PRINCIPLE: MEASUREMENTS FIRST

The most important design principle is:

> **The drawing is a visual representation of survey data, not the source of truth.**

A user should not be required to draw something to scale with the mouse and then expect the system to determine its real-world dimensions.

Instead:

```text
Real measurement
       ↓
Geometry
       ↓
Visual drawing
```

not:

```text
Mouse drawing
       ↓
Guess measurement
```

This is one of the major differences between a simple drawing application and a useful surveying application.

---

# 118. DESIGN PRINCIPLE: EXACT INPUT

Every major measurement should have an exact input mechanism.

For example:

```text
Length: 32.45 m
Bearing: 127°20'15"
```

The graphical canvas is primarily for visualization and editing.

---

# 119. DESIGN PRINCIPLE: AUTOMATIC CALCULATION

Whenever the geometry changes:

```text
Point changed
     ↓
Line changed
     ↓
Polygon changed
     ↓
Area recalculated
     ↓
Perimeter recalculated
     ↓
Labels updated
```

No "Calculate" button should be necessary for normal editing.

---

# 120. DESIGN PRINCIPLE: REVERSIBILITY

Every editing operation should be reversible.

```text
Edit
 ↓
Undo
 ↓
Previous state restored
```

This is particularly important because incorrect survey data can have significant downstream consequences.

---

# 121. DESIGN PRINCIPLE: TRANSPARENCY

The system should show users where calculated values came from.

For example:

```text
Area
1,250.42 m²

Calculation:
Shoelace Formula

Vertices:
4
```

An advanced information panel could show:

```text
Coordinate-derived area
```

rather than presenting a number with no explanation.

---

# 122. DESIGN PRINCIPLE: NO FALSE PRECISION

If the input data is:

```text
25.4 m
```

the application should not imply that the result has millimetre-level surveying accuracy merely because the computer displays many decimal places.

Therefore:

```text
Numerical precision
```

and:

```text
Measurement accuracy
```

must be treated as separate concepts.

---

# 123. PROFESSIONAL DISCLAIMER

The application should include a clear statement in the report:

> "This software performs computational and graphical processing of user-provided survey data. Generated measurements should be independently verified by a qualified survey professional before being used for legal, cadastral, construction, or property-boundary purposes."

---

# 124. FAILURE SCENARIOS

## Browser closes

Restore autosaved project.

## Invalid polygon

Display validation error.

## Export failure

Provide retry option.

## Corrupted project

Attempt recovery from backup.

## Extremely large drawing

Use rendering optimization.

## Missing point reference

Mark affected geometry as invalid.

---

# 125. OBSERVABILITY

For cloud deployment:

Monitor:

```text
API latency
Error rate
Export failures
Storage usage
Authentication failures
```

Do not unnecessarily log sensitive property coordinates.

---

# 126. DEPLOYMENT

For the first version:

```text
Source Code
    ↓
Build
    ↓
Static Web Application
    ↓
Browser
```

Possible hosting architecture:

```text
Frontend
Static hosting/CDN

Backend
Optional API server

Database
Optional PostgreSQL
```

---

# 127. OFFLINE-FIRST DESIGN

Offline capability is highly desirable.

The user should be able to:

```text
Open application
 ↓
Create project
 ↓
Perform survey calculations
 ↓
Save project
```

without an internet connection.

Internet should only be required for optional features such as:

* Cloud synchronization.
* Online maps.
* Account authentication.
* Software updates.

---

# 128. TECHNOLOGY RECOMMENDATION

### Frontend

```text
React
TypeScript
SVG
CSS/Tailwind
```

### Geometry

```text
Custom geometry engine
```

or a suitable well-tested geometry library for advanced operations.

### Storage

```text
IndexedDB
```

### Backend

Optional:

```text
Node.js
Express / Fastify
```

### Database

```text
PostgreSQL
```

### PDF

```text
PDF generation library
```

### Deployment

```text
Static hosting + optional cloud API
```

---

# 129. WHY TYPESCRIPT

TypeScript is recommended because the application has many structured entities:

```text
Point
Line
Polygon
Measurement
Project
Annotation
Viewport
Command
```

Strong typing reduces errors in geometry-heavy code.

Example:

```typescript
interface SurveyPoint {
    id: string;
    label: string;
    x: number;
    y: number;
    elevation?: number;
}
```

---

# 130. CORE MODULE STRUCTURE

Recommended project structure:

```text
src/
│
├── components/
│   ├── Toolbar/
│   ├── Canvas/
│   ├── PropertyPanel/
│   ├── PointTable/
│   ├── MeasurementPanel/
│   └── ProjectManager/
│
├── geometry/
│   ├── point.ts
│   ├── line.ts
│   ├── polygon.ts
│   ├── distance.ts
│   ├── bearing.ts
│   ├── area.ts
│   └── intersection.ts
│
├── survey/
│   ├── traverse.ts
│   ├── closure.ts
│   ├── conversion.ts
│   └── coordinates.ts
│
├── storage/
│   ├── indexeddb.ts
│   └── projectSerializer.ts
│
├── export/
│   ├── pdf.ts
│   ├── csv.ts
│   ├── svg.ts
│   └── json.ts
│
├── commands/
│   ├── createPoint.ts
│   ├── movePoint.ts
│   ├── deletePoint.ts
│   └── history.ts
│
└── app/
    ├── state.ts
    └── settings.ts
```

---

# 131. CORE GEOMETRY API

Example interface:

```typescript
function distance(
    a: Point,
    b: Point
): number;

function bearing(
    a: Point,
    b: Point
): number;

function polygonArea(
    points: Point[]
): number;

function polygonPerimeter(
    points: Point[]
): number;

function isSelfIntersecting(
    points: Point[]
): boolean;
```

---

# 132. UNIT API

```typescript
convertDistance(
    value: number,
    from: DistanceUnit,
    to: DistanceUnit
): number;

convertArea(
    value: number,
    from: AreaUnit,
    to: AreaUnit
): number;
```

---

# 133. QUALITY REQUIREMENTS

The application should be:

### Accurate

Calculations must be mathematically correct.

### Usable

A surveyor should be able to perform common operations without extensive training.

### Fast

Common operations should feel instantaneous.

### Reliable

Projects should not be lost.

### Extensible

New survey formats and tools should be addable later.

### Portable

Projects should not be locked into a single browser/device.

---

# 134. ACCEPTANCE CRITERIA

The MVP is considered successful when a user can:

1. Create a project.
2. Select units.
3. Add four survey points.
4. Enter exact coordinates.
5. Connect the points.
6. Close the boundary.
7. Automatically calculate area.
8. Automatically calculate perimeter.
9. View each side length.
10. View coordinates.
11. Undo an edit.
12. Redo an edit.
13. Save the project.
14. Reopen the project.
15. Export the survey as PDF.
16. Export coordinates as CSV.

---

# 135. EXAMPLE END-TO-END TEST

Input:

```text
A = (0,0)
B = (20,0)
C = (20,30)
D = (0,30)
```

Expected:

```text
AB = 20 m
BC = 30 m
CD = 20 m
DA = 30 m

Perimeter = 100 m

Area = 600 m²
```

Conversions:

```text
600 m²
≈ 6458.35 ft²
≈ 0.1483 acre
≈ 14.83 cents
```

The application should produce these values within the configured display precision.

---

# 136. FUTURE VERSION ROADMAP

## Version 1.0

Core drawing and calculations.

## Version 1.5

Advanced survey tools.

```text
Traverse
Closure
Bearing
Coordinate entry
Advanced dimensions
```

## Version 2.0

Professional interoperability.

```text
DXF
GeoJSON
KML
LandXML
```

## Version 2.5

Cloud collaboration.

```text
Accounts
Cloud projects
Sharing
Permissions
Version history
```

## Version 3.0

Field surveying.

```text
GPS
GNSS
Mobile field mode
Offline maps
Total station import
```

---

# 137. FINAL SYSTEM ARCHITECTURE

The final conceptual architecture is:

```text
                         SURVEYOR
                            │
                            ▼
                    ┌───────────────┐
                    │   SurveyCAD   │
                    │ Web Interface │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
          Drawing       Survey         Project
           Engine       Engine         Manager
              │             │             │
              │             │             │
              ▼             ▼             ▼
         Geometry       Calculation    Storage
          Engine          Engine       Engine
              │             │             │
              └─────────────┼─────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Export Engine │
                    └───────┬───────┘
                            │
               ┌────────────┼────────────┐
               ▼            ▼            ▼
              PDF          CSV          JSON
```

---

# 138. CONCLUSION

SurveyCAD is designed as a **purpose-built digital surveying workspace**, not a direct replacement for every function available in AutoCAD.

Its core philosophy is:

```text
Survey Measurements
        ↓
Accurate Geometry
        ↓
Automatic Calculations
        ↓
Visual Drawing
        ↓
Professional Documentation
```

The most important functional capability is that the user can provide **real survey measurements and coordinates**, while the software maintains the geometry and automatically calculates:

```text
Distance
Bearing
Perimeter
Area
Area conversions
Coordinates
```

The architecture deliberately separates the:

```text
UI
↓
Drawing Engine
↓
Geometry Engine
↓
Survey Calculation Engine
↓
Storage
↓
Export
```

This makes the system easier to maintain, test, and extend.

The initial implementation should remain deliberately focused. Rather than attempting to recreate hundreds of AutoCAD commands, the first release should solve the surveyor's core problem exceptionally well: **turning measured boundary data into an accurate, editable drawing with automatically calculated areas and professional reports.**

**End of Software Design Document**

