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