# Skip Heavy Renderings in Sitecore Experience Editor

This customization prevents selected renderings from executing in Sitecore Experience Editor editing mode. It is intended to reduce the time required to retrieve and render layout data when computationally expensive components are present.

The rendering is skipped only on the CM request running in Experience Editor editing mode. The Next.js editing host can still display the component placeholder or a red, non-editable highlight because the rendering host receives layout data separately. Test the behavior in a pre-production environment before enabling it in production.

## How It Works

1. Authors select expensive renderings in a Sitecore TreeList field.
2. A processor runs first in the `mvc.renderRendering` pipeline.
3. When Experience Editor editing mode is active, the processor compares the current rendering ID with the selected IDs.
4. Matching renderings abort the rendering pipeline.
5. All non-editing requests continue through the normal pipeline.

## Files Involved

The implementation consists of these files:

- `authoring/platform/Pipelines/RenderRendering/SkipRenderingsInEditMode.cs`
  - Defines the `SkipRenderingsInEditMode` processor.
- `authoring/platform/App_Config/Include/XmCloudNextJsStarter/XmCloudNextJsStarter.SkipRenderingsInEditMode.config`
  - Registers the processor before the first `mvc.renderRendering` processor.
- `authoring/platform/Platform.csproj`
  - Explicitly compiles the processor and publishes the `App_Config\Include` files.
- `authoring/items/items/templates/items/ccl.templates/click-click-launch/Edit Mode Rendering Exclusions.yml`
  - Defines the Sitecore template.
- `authoring/items/items/templates/items/ccl.templates/click-click-launch/Edit Mode Rendering Exclusions/Configuration.yml`
  - Defines the template section.
- `authoring/items/items/templates/items/ccl.templates/click-click-launch/Edit Mode Rendering Exclusions/Configuration/Excluded Renderings.yml`
  - Defines the TreeList field.
- `authoring/items/items/templates/items/ccl.modules/click-click-launch/Edit Mode Rendering Exclusions.yml`
  - Defines the settings item under `/sitecore/system/Settings/Project/click-click-launch`.

The serialized items are intentionally stored under the existing `Project.click-click-launch` module. Do not add another module that includes the same Sitecore paths; the existing module already includes the complete CCL template and settings trees.

## Implementation Steps

### 1. Add the processor

Create `authoring/platform/Pipelines/RenderRendering/SkipRenderingsInEditMode.cs`:

```csharp
using System;
using System.Linq;
using Sitecore;
using Sitecore.Data;
using Sitecore.Data.Fields;
using Sitecore.Mvc.Pipelines.Response.RenderRendering;

namespace XmCloudNextJsStarter.Pipelines.RenderRendering
{
    public class SkipRenderingsInEditMode : RenderRenderingProcessor
    {
        public string ConfigurationItemId { get; set; }

        public string FieldNameOrId { get; set; }

        public override void Process(RenderRenderingArgs args)
        {
            if (args?.Rendering?.RenderingItem == null || !Context.PageMode.IsExperienceEditorEditing)
                return;

            if (!ID.TryParse(ConfigurationItemId, out var configurationItemId) || string.IsNullOrWhiteSpace(FieldNameOrId))
                return;

            var database = Context.Database ?? Context.ContentDatabase;
            var configurationItem = database?.GetItem(configurationItemId);
            var excludedRenderingsField = configurationItem?.Fields[FieldNameOrId];

            if (excludedRenderingsField == null)
                return;

            var excludedRenderings = new MultilistField(excludedRenderingsField);
            if (excludedRenderings.GetItems().Any(item => item.ID == args.Rendering.RenderingItem.ID))
                args.AbortPipeline();
        }
    }
}
```

### 2. Register the pipeline processor

Create `authoring/platform/App_Config/Include/XmCloudNextJsStarter/XmCloudNextJsStarter.SkipRenderingsInEditMode.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration xmlns:patch="http://www.sitecore.net/xmlconfig/">
  <sitecore>
    <pipelines>
      <mvc.renderRendering>
        <processor
          type="XmCloudNextJsStarter.Pipelines.RenderRendering.SkipRenderingsInEditMode, XmCloudNextJsStarter"
          patch:before="processor[1]">
          <ConfigurationItemId>{7D0C4E4D-6F66-4E54-9C8C-4BF8B7757A7D}</ConfigurationItemId>
          <FieldNameOrId>{A0B4E7B0-4A38-4B6D-B8C7-5F7CC0B5E4F4}</FieldNameOrId>
        </processor>
      </mvc.renderRendering>
    </pipelines>
  </sitecore>
</configuration>
```

The values are fixed to the serialized items in this repository:

| Setting | Value |
| --- | --- |
| Configuration item ID | `{7D0C4E4D-6F66-4E54-9C8C-4BF8B7757A7D}` |
| TreeList field ID | `{A0B4E7B0-4A38-4B6D-B8C7-5F7CC0B5E4F4}` |
| Settings item path | `/sitecore/system/Settings/Project/click-click-launch/Edit Mode Rendering Exclusions` |
| Template field path | `/sitecore/templates/Project/click-click-launch/Edit Mode Rendering Exclusions/Configuration/Excluded Renderings` |

Use the field ID in the patch. Using the ID avoids a dependency on the field display name.

### 3. Include the C# file in the web project

Add the processor explicitly to `authoring/platform/Platform.csproj` because this is a legacy non-SDK web project:

```xml
<ItemGroup>
  <Compile Include="Pipelines\RenderRendering\SkipRenderingsInEditMode.cs" />
</ItemGroup>
```

Also ensure the project publishes the Sitecore include files:

```xml
<ItemGroup>
  <Content Include="App_Config\Include\**\*" />
</ItemGroup>
```

### 4. Define the Sitecore template

The serialized template must use this hierarchy:

```text
Edit Mode Rendering Exclusions       template definition
`-- Configuration                     template section
    `-- Excluded Renderings           TreeList field
```

The important Sitecore template types are:

| Item | Template ID |
| --- | --- |
| Template definition | `ab86861a-6030-46c5-b394-e8f99e8b87db` |
| Template section | `e269fbb5-3750-427a-9149-7aa950b49301` |
| TreeList field | `455a3e98-a627-4b40-8035-e683a0331ac7` |

The TreeList field must be a child of the section item, not a direct child of the template definition. Its source is `/sitecore/layout/Renderings`.

### 5. Define the settings item

Create the serialized settings item:

```text
/sitecore/system/Settings/Project/click-click-launch/Edit Mode Rendering Exclusions
```

It must use the `Edit Mode Rendering Exclusions` template. The item is initially empty by design; no renderings are disabled until an author selects them.

### 6. Keep the serialization module ownership correct

This repository's existing `authoring/items/items/templates/ccl.module.json` already includes:

- `/sitecore/templates/Project/click-click-launch`
- `/sitecore/system/settings/Project/click-click-launch`

Therefore, place the serialized files under the existing CCL source directories:

```text
authoring/items/items/templates/items/ccl.templates/click-click-launch/
authoring/items/items/templates/items/ccl.modules/click-click-launch/
```

Do not create a second module with overlapping include paths. Overlapping modules cause resource-package errors such as:

```text
The item ... is contained multiple modules
```

## Validate Before Deployment

Run these checks from the repository root.

### Validate the project and source diagnostics

```powershell
dotnet build authoring\XmCloudAuthoring.sln
```

The build environment must provide the .NET Framework 4.8 reference assemblies and Visual Studio Web Application targets. The SitecoreAI build agent normally supplies these targets.

### Validate the patch XML

```powershell
[xml]$patch = Get-Content `
  'authoring\platform\App_Config\Include\XmCloudNextJsStarter\XmCloudNextJsStarter.SkipRenderingsInEditMode.config' `
  -Raw
```

### Validate the critical IDs and serialized hierarchy

```powershell
$settings = Get-Content `
  'authoring\items\items\templates\items\ccl.modules\click-click-launch\Edit Mode Rendering Exclusions.yml' `
  -Raw

$field = Get-Content `
  'authoring\items\items\templates\items\ccl.templates\click-click-launch\Edit Mode Rendering Exclusions\Configuration\Excluded Renderings.yml' `
  -Raw

if ($settings -notmatch '7d0c4e4d-6f66-4e54-9c8c-4bf8b7757a7d') {
    throw 'Settings item ID does not match the pipeline patch.'
}

if ($field -notmatch 'a0b4e7b0-4a38-4b6d-b8c7-5f7cc0b5e4f4') {
    throw 'TreeList field ID does not match the pipeline patch.'
}

if ($field -notmatch 'Parent: "7499d60a-fdc5-42a1-bb04-be81e64bad28"') {
    throw 'TreeList field is not parented to the Configuration section.'
}
```

If the Sitecore CLI is available, also run the repository's normal serialization validation command before deployment. Do not proceed if it reports duplicate item IDs or overlapping module ownership.

## Build and Deploy to SitecoreAI

1. Commit the processor, patch, project-file, and serialized item changes to the branch configured for the SitecoreAI environment.
2. Push the commit to the remote repository.
3. In the Sitecore Cloud Portal, open the target XM Cloud project and environment.
4. Start **Build and deploy** for the environment or editing host that builds this repository.
5. Monitor the build log.
6. Confirm that:
   - NuGet restore completes.
   - `XmCloudAuthoring.sln` builds successfully.
   - Resource-package creation completes without duplicate-module errors.
   - The deployment completes successfully.
7. Allow the CM application to restart after the assembly and configuration files are deployed.

The authoring build deploys the `XmCloudNextJsStarter.dll` assembly and the Sitecore include patch. The serialized items are deployed by the existing CCL item module.

## Configure the Exclusions After Deployment

1. Open Sitecore Content Editor against the CM environment.
2. Navigate to:
   `/sitecore/system/Settings/Project/click-click-launch/Edit Mode Rendering Exclusions`
3. Edit the `Excluded Renderings` field.
4. Select the rendering items that should not execute in Experience Editor editing mode.
5. Save and publish the settings item if the editing request reads from a published database in your environment.
6. Open a page in Experience Editor editing mode and measure layout retrieval and page load time.

Start with a small number of clearly expensive components. Do not exclude components that authors must edit during the normal workflow.

## Expected Behavior and Limitations

- Selected renderings are skipped only when `Context.PageMode.IsExperienceEditorEditing` is true.
- Delivery, preview, and normal rendering requests are unchanged.
- The component may still appear in the Next.js editing host because the host fetches layout data independently.
- The component may appear as a red, non-editable region in Experience Editor.
- The processor is a performance workaround, not a replacement for optimizing the expensive component or its data source.
- Measure the result in pre-production before enabling the configuration in production.

## Troubleshooting

### Duplicate module or item errors

Check that there is no standalone module including the CCL template or settings paths. The new serialized files must remain under the existing CCL module source directories.

### The processor does not run

Verify all of the following:

- `SkipRenderingsInEditMode.cs` is listed under `<Compile>` in `Platform.csproj`.
- The deployed assembly is named `XmCloudNextJsStarter.dll`.
- The patch type is exactly:
  `XmCloudNextJsStarter.Pipelines.RenderRendering.SkipRenderingsInEditMode, XmCloudNextJsStarter`
- The patch is present under `App_Config/Include` on CM.
- The configuration item ID and field ID match the serialized items.
- The request is actually in Experience Editor editing mode.

### A rendering is still executed

Verify that the rendering item selected in the TreeList is the same rendering item used by the page layout. The processor compares rendering item IDs, not rendering names or component names.
