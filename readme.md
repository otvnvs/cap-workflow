# MonoRepos


To help with your development notes, here is a breakdown of the differences between the Workspace Package approach we just set up and the CAP Plugin approach.

## Monorepo Package vs. CAP Plugin

| Feature       | Workspace Package (Modular App Logic)                                          | CAP Plugin (Framework Extension)                                                |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Primary Goal  | Dividing business domains (e.g., `Sales`, `Inventory`) into manageable pieces. | Adding generic features (e.g., custom logging, auditing) to _any_ service.      |
| Activation    | Explicit: You must add `using from '@vp/test'` in your main CDS files.         | Implicit: CAP finds it automatically if `cds-plugin.js` exists in the package.  |
| Model Scope   | Owns its own entities and services that the main app "consumes."               | Usually "observes" or "intercepts" existing entities using `cds.on` hooks.      |
| Deployment    | Models are bundled into the main `csn.json` during `cds build`.                | Often causes issues if the plugin tries to inject hidden database requirements. |
| Best Used For | Internal project structure and Monor

* Automatic Loading: Plugins load automatically when CAP starts. If your plugin defines a database schema but the main project isn't aware of it during the cds deploy or cds build phase, it often results in "table not found" errors.
* Implicit vs. Explicit: Plugins are "invisible" extensions. Workspace packages are "explicit" modules. For business services (like your TestService), the framework prefers the explicit workspace approach so that the cds compiler knows exactly which models to include in the build. 

## Developer Note Summary
Use Packages when you want to build a specific service or database model that belongs to your app logic. Use Plugins only when you want to write code that modifies how all services behave (e.g., adding a common lastChangedBy field to every entity automatically).

# Getting Started

Welcome to this CAP project.

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`packages/test` | test monorepo
`readme.md` | this getting started guide

## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start with your domain model, in a CDS file in `db/`

## Learn More

Learn more at <https://cap.cloud.sap>
