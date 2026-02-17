@component
export class StencilMask extends BaseScriptComponent {
    
    @input
    @hint("The mesh visual that acts as the mask (e.g., quad with transparent material)")
    maskVisual: RenderMeshVisual;
    
    @input
    @hint("The Gaussian Splat visual that should only show through the mask")
    gaussianSplatVisual: GaussianSplattingVisual;
    
    @input
    @hint("Stencil reference value (default 1)")
    stencilRef: number = 1;
    
    @input
    @hint("Enable to see the mask for debugging (disable for final effect)")
    debugShowMask: boolean = false;
    
    @input
    @hint("Mask color when debug mode is on (RGB)")
    @widget(new ColorWidget())
    maskColor: vec4 = new vec4(1, 0, 0, 0.5);
    
    @input
    @hint("Render order for mask (must be LOWER than Gaussian Splat)")
    maskRenderOrder: number = 0;
    
    @input
    @hint("Render order for Gaussian Splat (must be HIGHER than mask)")
    gaussianRenderOrder: number = 100;

    onAwake() {
        this.setupStencil();
    }

    setupStencil() {
        // Configure the MASK (writes to stencil buffer)
        if (this.maskVisual) {
            const maskPass = this.maskVisual.mainPass;
            
            if (!maskPass) {
                print("StencilMask: ERROR - Mask visual has no mainPass. Make sure it has a material assigned!");
                return;
            }
            
            // Set render order - mask must render FIRST (lower number)
            this.maskVisual.setRenderOrder(this.maskRenderOrder);
            print("StencilMask: Mask render order set to " + this.maskRenderOrder);
            
            // CRITICAL: Disable depth write so mask doesn't occlude the Gaussian
            maskPass.depthWrite = false;
            
            // Set mask visibility based on debug mode
            if (this.debugShowMask) {
                // Show the mask with the specified color
                maskPass.colorMask = new vec4b(true, true, true, true);
                
                // Try to set the base color if the material supports it
                try {
                    maskPass.baseColor = this.maskColor;
                } catch (e) {
                    // Material might not have baseColor property
                    print("StencilMask: Note - Could not set baseColor on mask material");
                }
                
                // Enable alpha blending for transparency
                maskPass.blendMode = BlendMode.Normal;
                
                print("StencilMask: Debug mode ON - Mask is visible with color: " + this.maskColor);
            } else {
                // Hide the mask completely (only write to stencil)
                maskPass.colorMask = new vec4b(false, false, false, false);
                print("StencilMask: Debug mode OFF - Mask is invisible");
            }
            
            // Configure stencil to WRITE (modify existing stencilState)
            const maskStencil = maskPass.stencilState;
            maskStencil.enabled = true;
            maskStencil.stencilCompareFunction = StencilFunction.Always; // Always pass
            maskStencil.depthStencilPassOperation = StencilOperation.Replace; // Write ref value
            maskStencil.stencilFailureOperation = StencilOperation.Keep;
            maskStencil.depthFailureOperation = StencilOperation.Keep;
            maskStencil.referenceValue = this.stencilRef;
            maskStencil.readMask = 255;
            maskStencil.writeMask = 255;
            maskStencil.face = StencilFace.FrontAndBack;
            
            print("StencilMask: Mask configured - writes stencil value " + this.stencilRef);
        } else {
            print("StencilMask: WARNING - No mask visual assigned!");
        }
        
        // Configure the GAUSSIAN SPLAT (reads from stencil buffer)
        if (this.gaussianSplatVisual) {
            // Set render order - Gaussian must render AFTER mask (higher number)
            this.gaussianSplatVisual.setRenderOrder(this.gaussianRenderOrder);
            print("StencilMask: Gaussian Splat render order set to " + this.gaussianRenderOrder);
            
            const gsPass = this.gaussianSplatVisual.mainPass;
            
            if (!gsPass) {
                print("StencilMask: ERROR - Gaussian Splat has no mainPass. Trying mainMaterial...");
                
                // Try accessing via mainMaterial instead
                const gsMaterial = this.gaussianSplatVisual.mainMaterial;
                if (gsMaterial && gsMaterial.mainPass) {
                    this.configureGaussianStencil(gsMaterial.mainPass);
                } else {
                    print("StencilMask: ERROR - Could not access Gaussian Splat material. Make sure it has a material assigned!");
                }
                return;
            }
            
            this.configureGaussianStencil(gsPass);
        } else {
            print("StencilMask: WARNING - No Gaussian Splat visual assigned!");
        }
    }
    
    configureGaussianStencil(gsPass: Pass) {
        // Configure stencil to READ (modify existing stencilState)
        const gsStencil = gsPass.stencilState;
        gsStencil.enabled = true;
        gsStencil.stencilCompareFunction = StencilFunction.Equal; // Only render where stencil equals ref
        gsStencil.depthStencilPassOperation = StencilOperation.Keep;
        gsStencil.stencilFailureOperation = StencilOperation.Keep;
        gsStencil.depthFailureOperation = StencilOperation.Keep;
        gsStencil.referenceValue = this.stencilRef;
        gsStencil.readMask = 255;
        gsStencil.writeMask = 0; // Don't write to stencil
        gsStencil.face = StencilFace.FrontAndBack;
        
        print("StencilMask: Gaussian Splat configured - reads stencil value " + this.stencilRef);
    }
}
