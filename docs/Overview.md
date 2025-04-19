----------------------------------------
Anatomy of InSpatial Extensions
----------------------------------------

InSpatial Enables developers to build fully integrated first party extensions that extend every scope of the platform. 

An extension must is essentially its own app embedded within InSpatial App, this means the developers are responsible for where and how the extension is accessed. 

All Extensions can be found on inspatial.store along which houses 

1. Extensions
2. Templates
3. Apps

Every extension when deployed is launched on InSpatial Store, like a typical app this means the extension is required to have following;

1. Name
2. Icon
3. Description 
4. Media (optional)


There are three types of extensions to visually put in the context of InSpatial App. 
1. Popup Extension - This extension opens as a small popover with similar experience as the a properties dialog. 

2. Full Extension - This extension has access to the entire screen from the explorer panel to the inspector panel. Can take all of the screen with the exception of the Left and Top Navigator in the editor. An Example of this type of extension are. 

-. InSpatial Forms - replaces full screen
-. InSpatial Email - replaces full screen


1. Progressive Extension - This is an extension that doesn't not replace the full screen but progressively adds to the screen coming in as a drawer or partially replace some parts of it e.g replaces just the inspector panel. Examples of progressive extensions are;

-. InSpatial Timelines - comes in from the bottom 
-. InSpatial Shadergraph- comes in from the bottom

All Extensions can be found on the Left Navigator of the Editor. Similar to discord, there's an entire area dedicated to Shwoing all installed extensions just after the Add Call to action which is responsible for adding components as well as extensions in the edit-or. 

---
Scoping Extensions:
Extensions are limited to core InSpatial Editor features such as:

    1. Windows
    2. Scenes
    3. Data/Backend
    4.Dev Mode

Icons of scoped extensions only appear in relevant sections (e.g., dev mode-specific icons show up only in dev mode).
Sub-Scoping for Windows Extensions:

    Number Sub-Scope: e.g., Auto layout, corner radius, font properties, layer opacity, etc.
    String Sub-Scope: e.g., Font family, font weight/style, text string.

---

### **SCOPING FOR SCENES EXTENSIONS**
Scenes in InSpatial are core to spatial content creation and are likely tied to 3D environments, objects, or spatial layouts. Extensions scoped to Scenes interact with spatial elements within the editor, such as objects, layers, or environmental settings.

#### **Sub-Scoping for Scenes Extensions**:
Developers can narrow their extensions to specific spatial aspects within scenes:

1. **Object Manipulation**:
   - Translation (Position X, Y, Z)
   - Rotation (Rotation angles for X, Y, Z axes)
   - Scaling (Adjusting object sizes proportionally or independently)

2. **Lighting & Environment**:
   - Scene Lighting (Intensity, Shadows, Light Types)
   - Environment settings (Backgrounds, HDRI, Skyboxes)

3. **Material & Textures**:
   - Apply custom materials or shaders to objects
   - Adjust textures (UV mapping, tiling, scaling, etc.)

4. **Object Properties**:
   - Object naming conventions
   - Visibility toggles (Hide/Show)
   - Physics and Interactions (Collisions, Gravity)

5. **Cameras**:
   - Camera perspectives (Field of view, orthographic/perspective views)
   - Camera transitions (Speed, focal point)

6. **Interaction Events**:
   - Event triggers for object interactions (Hover, click, proximity)

#### **Example**: 
An extension for a custom shader might only appear when a 3D object is selected, allowing users to apply and modify shaders directly in the scene without accessing other parts of the UI.

---

### **SCOPING FOR INSPATIAL CLOUD EXTENSIONS**
Extensions that focus on **InSpatial Cloud** allow developers to interact with the backend and data layer of the UDE, from storage to real-time interaction with databases or APIs. InSpatial Cloud extensions are critical for backend processes like retrieving or updating data, integrating with external services, or managing user-generated content.

#### **Sub-Scoping for Cloud Extensions**:
1. **Database Management**:
   - CRUD operations (Create, Read, Update, Delete)
   - Connecting to external data sources (APIs, cloud storage, databases)
   - Data binding (Connect objects in scenes to live data streams or databases)

2. **APIs & Webhooks**:
   - API integration and authentication
   - Webhook triggers (Real-time updates, triggers based on events like object changes or scene loads)

3. **User & Session Management**:
   - Handling user data (Login states, user preferences)
   - Session persistence (Saving user states across different scenes or visits)

4. **Real-time Collaboration**:
   - Extensions for real-time data synchronization

5. **Analytics & Tracking**:
   - Tracking user interactions within the platform
   - Displaying data-driven insights for scene performance or user behavior

#### **Example**:
An analytics extension could only appear when developers are working within the backend settings, displaying real-time usage stats or data about object interactions during a live session.

---

### **SCOPING FOR INSPATIAL APP (DEV MODE) EXTENSIONS**
**Dev Mode** in InSpatial provides a more advanced environment for developers who want to customize the platform or use code alongside visual workflows. Put simply Dev modes turns the visual editor into an integrated development environment (IDE) with changes to the visual aspect syncing the with code and vice versa in real-time. Extensions scoped for Dev Mode focus on tools, debugging, and developer-level customizations, targeting those who need more granular control over the platform.

#### **Sub-Scoping for  INSPATIAL APP (DEV MODE) Extensions**:

1. **Debugging Tools**:
   - Real-time logs and console outputs (for error tracking)
   - Performance monitoring tools (CPU/GPU usage, memory profiling)

2. **Version Control & Collaboration**:
   - Extensions to integrate with Git, SVN, or other version control systems
   - Branch management and code deployment tools

3. **Plugin and SDK Integration**:
   - Enabling integration with external SDKs or libraries
   - Plugin development tools (for testing and deploying custom InSpatial plugins)

4. **Custom Workflows**:
   - Extensions that build new low-code workflows or automation scripts for repetitive tasks
   - Task runners and build systems (for scene export, compression, etc.)

#### **Example**:
A debugging extension might only appear in **Dev Mode**, providing a console for error tracking and output directly from scripts running in the background of scenes or objects.

---

### **User Interface Integration for Extensions**:
As mentioned earlier, all extensions can be accessed via the **Left Navigator** of the InSpatial App, similar to the UI model of Discord. There’s a dedicated space for installed extensions, allowing users to toggle between different tools easily. The placement of each extension in the UI will depend on its **scoping** and **sub-scoping**. 

For example:
- **Scenes extensions** might only appear when editing objects within the 3D environment.
- **Cloud extensions** will likely show up when configuring databases, APIs, or user management systems.
- **Dev Mode extensions** are only accessible when the user has entered the more advanced developer setting of the platform.

---

### **Key Takeaway**:
InSpatial's approach allows developers to build rich, cross-platform and spatial apps and experiences. The flexibility provided by scoping and sub-scoping helps ensure extensions are accessible only in relevant contexts, simplifying the user experience while enhancing the functionality of the editor.

Each extension type—whether **popup**, **full**, or **progressive**—can be tailored to integrate seamlessly with the core platform features, providing intuitive and powerful workflows for both no-code and low-code users.


-------------------------------------------
Interactive Assets (Scene)
-------------------------------------------

Interactive Assets are self-sufficient asset types that blur the line and sit at the intersection of an asset and an interaction. While many if not all of the assets that fall under this category can be achived via InSptial's native Interaction (Triggers & Actions), interactive assets tend to shortcut the time to get to a desired state without using the native method. You can add them like any other assets and control their settings and properties via the inspector panel. 

-.Interactive Sensor Assets  (inspired by sceneri) powered by Rapier Physics
1. Harzard Sensor: 
2. Teleport Sensor:
3. Transmitter Sensor: 
4. Spawn Point: Availale in AR/VR scenes allows you to set a location where players appear when an experience starts. This especially useful for Spatial Gaming. 

-.Interactive Gravity Assets
1. Directional Gravity
2. Spherical Gravity
3. Attractors (Magnets) https://react-three-rapier.pmnd.rs/attractors
4. Repellers 


-.Interactive Control Assets (from natuerlich)
1. Grabbable: 
2. 


$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

**************************************************************************************************************************************
*************************************************************NESTED ASSETS (Page/UI & Scene)*************************************************************
**************************************************************************************************************************************

A Nested Asset or simply a Nest is an embedded layer of a a page, ui or scene. There are two types of nested assets. 

1. UI Nest 
2. Scene Nest 

You can use nested assest inside both Page/UI and Scene editor e.g you can nest a UI inside a page or a scene, and a scene inside a page. 
Nested assets helps connect separate parts of your InSpatial app. 


-. UI Nest: This is an asset type that allow you to drop in/embed your created UI's into you scene as 2D user interfaces only.  The UI takes account the screen media query used in building for mobile, tablet and desktop. The pattern changes for Headsets (TBD)... 
The UI Layer has two main properties

1. UI Source: The UI source allows you to choose from your list of UI you created in your project.
2. UI Scope: The UI scope allows to choose how the UI is applied i.e it can be applied

Types of UI Scope 
>>>> 1. World Scope (default) - The UI gets applied as a standlone primitive 3D asset inside your scene just a Model/Light asset. 
>>>> 2. Screen Scope - The UI gets applied as a 2D user interface overlay, leveraging the entire screen viewport especially notable in mobile and desktop.



1. Scene Nest: This is an asset type that allow you to drop in/embed any of your created scene inside a Page or another Scene.

$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

--------------------------
Nature Assets (Scene)
--------------------------
-. Sun:
-. Landscape:



--------------------------
Advanced Assets (Page/UI)
--------------------------
1. Map 
2. iFrame
3. Spline Scene
4. Rive Graphics 

--------------------------
Nested Assets (Page/UI)
--------------------------
1. UI Nest
2. Scene Nest

--------------------------
Regular Assets (Page/UI)
--------------------------
1. Button
2. Icon  ...

--------------------------
Spatial Kit Assets (Page/UI)
--------------------------
1. Spatial Button
2. Spatial Icon ...


--------------------------
Widgets Assets (Page/UI)
--------------------------

1. Header
2. Footer


--------------------------
Form Assets (Page/UI)
--------------------------
1. Contact Form
2. Auth Form
3. Stripe Form 
4. Type Form


---------------------------------------------------
Layout Assets (Page/UI) rename to Structural Assets 
---------------------------------------------------
- Frame (an absolute div) powered by Movable. 
- Container (a static div)

Stack (flex)
- XStack (horizontal flex - row direction)
- YStack (vertical flex - column direction)
- ZStack


- Wrap (a responsive container that wraps automatically if there isn't enough space)
- Center (container that centers it children)
- Aspect Ratio (container with fixed/preset width & heights)

- Grid
- Slot
- Portal


-----------------------------
Shape Assets (Page/UI)
-----------------------------
- Square 
- Circle 

--------------------------
Data Assets (Page/UI)
--------------------------
these are asset types that allow you to list or fill a component with the different data created in the Data micro-service
1. Table
2. Interactive/Data Table
3. Charts
4. List

----------------------------------------------------------------------------------------------------------
Action Scope: the level to which an action is applied to. (App/Project Level vs Page Level vs Scene Level)
----------------------------------------------------------------------------------------------------------


-------------------
New Triggers (Scene)
-------------------
1. On Rotate
2. On Scale 
3. On Move



-------------------
New Triggers (Page/UI)
-------------------
1. On Authenticate
2. On Scroll


-------------------------------
New Extensions (Window & Scene)
-------------------------------
1. InSpatial CMS
2. 



-----------------------------
Page/UI Tags for Project Map
-----------------------------
1. Launch Page 
2. Home Page
3. Auth Page
4. (404) Not Found Page
5. (500) Server Error Page



-------------------------
Page actions 
-------------------------
- Install App
- Change Theme (Light/Dark)
- Notification (Push & Toast)
- Reload
- Share 




-----------------------------------------------------------------------------------------------------------
Dynamic/(API) Actions
-----------------------------------------------------------------------------------------------------------
1. Send Email
2. CRUD Data To/From data source
3. Accept Fiat Payments/Subscriptions (Stripe, Paypal, Razorpay, Paddle)
4. Accept Crypto Payment (BTC, SOL, ETH)
5. Authentication
6. Send notification and messages - (Slack, Discord)
7. Show Notifcations (Novu)
8. Calendar Invite (Google, Calendly)
9. Set Condition
10. Google Drive
11. Webhook
12. Set local storage


--------------------------
Realtime Actions
--------------------------
1. Realtime Notification: 

Listen to changes in your InSpatial data source and show users a toast notification.

1. Location: 
Listen to changes in your InSpatial data source regarding the position of a device moving coordinate.



---------------------------
New Base Actions
---------------------------
1. Go to App
2. Copy to clipboard
3. Run Custom Script


-------------------------------
New Features (Global Settings)
-------------------------------

1. Strict Styling with Variables: This will disable any use of styles that isn't a variable i.e clicking on any input will popup the variables panel users won't be able to enter a custom value if its not a vaariable. This is good because it means users can't break out of the design system.



-------------------------------
DATA
------------------------------
InSpatial supports four data types. 
1. Base Data: A realtime database that allows you to perform CRUD requests. 
2. Reward Data: 
3. Auth Data: 
4. Content Data: 




------------------------------------------------------------------
FAQ
------------------------------------------------------------------

DIFFERENCE BETWEEN DATA & VARIABLES ON INSPATIAL
Note: While many creative platforms treat variables like a datasource, InSpatial takes a different approach by treating your variables as a stylesource. 

"Data is not a variable and a variable is not a data."
 
A variable is a design system, allowing you to re-use the design values also known as (tokens) across your assets without recreating new styles for every instance of an asset. This ensures consistency across your project and app. 

Data on the other end, stores contents which you can then run basic operations on or interact with by either viewing, deleting and updating the content of the data. These types of operations where you can (CREATE, READ, UPDATE, DELETE) are called CRUD operations in the world of software development.


There's a confilicting narrative around a Variable (your InSpatial stylesource/design system) and Data (your InSpatial datasource/content management system) because they both share similar primitive data formats i.e String, Number, Boolean etc... however, Variables have 4 primary data formats while data have 5. 

VARIABLE (DESIGN SYSTEM) DATA FORMATS
1. String
2. Number
3. Boolean
4. Color

DATA (Data Formats)
1. String
2. Number
3. Boolean
4. DateTime
5. Link


The separation of variables and data into different groups allow a much more flexible and efficient spatial creation workflow.

To reiterate, Variable is a design System and acts as the source of your app/project style. a Data is a content management system and acts as the source of your app/project content. A Content Management Sytem integrates both a database and an authentication layer. 

------------------------------------------------------------------


The difference between an Ornament and a presentation lies in their interaction. Ornaments are static and often requires no form of trigger to get displayed, ornament presents controls and information related to a presented window or layout, without crowding or obscuring the presentation contents.

Presentation are driven by inputs e.g when you hover/click on a button. A prime example of a Presentation is a Popover, Modal Dialog, Toast Notices, Tooltips and Hovercards. 

Ornaments may be embedded inside or relative to a Presentation


------------------------------------------------------------------
The Inspatial editor is sub divided into three modes. 
1. Design Mode
2. Interaction Mode
3. Dev Mode. 


INTERACTION MODE

Interaction opens up an isolated view of the curently select asset, and shows all available instances of that asset. On by default all asset comes pre-configured with an Hover, Disabled and all pre-built variations of the asset which are called variants. 

Varaints are built using the pre-configured variable style source. Variables which are the style source of every asset can be detached to create a new style. You can also create your variables whcih are the recommended way of styling your assets because it ensures consistency.  

With that in mind, every asset is essentially a component by default. Components are reusable assets, when you make a change to the base or primary instance of an asset all variations of it update. 

When in Interaction mode, you have access to Triggers and Actions which by default opens as a bottom sheet with the viewport still in place, however encapsulating the isolated view of the currently selected asset. 

You can use Triggers to define the different input events of the currently selected asset, and actions to define what happens to the asset. 


-------------------------------------------------------------------

Window Screen Sizes - Breakpoint
--------------------------------

uses a cascading approach where modifications made on larger screens apply to smaller ones while smaller ones do not impact the larger ones, hence it is best practice to always start your designs with the XL screen size which is the largest breakpoint on InSpatial to ensure your window assets are applied across all screen sizes



-----------------------
VIDEO
-----------------------
InSpatial supports two types of videos
1. Volumetric/Spatial Video - tthis type of video feels like a gaussian splat its really a NERF, a kind of video that surrounds the scene or is the scene.
2. Stereo Video - a video conected to an asset as a texture which plays from the direction or position of the asset. 


---------------------------------
WORKFLOW: COMPONENT ARCHITECTURE  
---------------------------------
InSpatial starts with a declarative, component-driven approach where every asset is auto assigned relavant parameters across window and scene editors, creating a workflow that focuses on building reusable and composable components. You describe what your window or scene should look like, and the InSpatial Core handles the imperative details of rendering and updating your workflow. This type of architecture enables speed and effeicency all types of creators and is familiar for those coming from a design background. However within the Scene editor, certain assets like the EMPTY asset enable you to build your asset from the ground up by attaching custom properties provided by the InSpatial Core. The Empty asset leverages an entity component system (ECS) architecture which is great for creators coming from Gaming background. Combining Declarative and ECS architecture creates an holitic approach to spatial creation which enables creators of all kinds and background to feel right at home.  



------------------------------
INSPATIAL AR-SCENE PLACEMENT
------------------------------
1. Body Placement
-  Head
  -- eyes
  -- nose
  -- mouth
-  Hands
  -- fingers 
  -- palm
  -- arm
-  Legs
 

1. Object Placement
-  QR Code
-  Images
-  Real-World Items (via machine learning)

1. World Placement

2. Surface Placement
