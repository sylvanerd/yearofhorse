import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";

@component
export class LanternYAxisRotation extends BaseScriptComponent {
    
    @input
    @hint("Rotation speed multiplier")
    rotationSpeed: number = 1.0;
    
    @input
    @hint("Smoothing factor (0-1, higher = smoother)")
    smoothing: number = 0.15;
    
    private interactable: Interactable;
    private targetRotation: number = 0;
    private currentRotation: number = 0;
    
    onAwake() {
        this.createEvent("OnStartEvent").bind(() => {
            this.initialize();
        });
        
        this.createEvent("UpdateEvent").bind(() => {
            this.onUpdate();
        });
    }
    
    initialize() {
        const transform = this.getSceneObject().getTransform();
        const currentRot = transform.getLocalRotation().toEulerAngles();
        this.currentRotation = currentRot.y * (180 / Math.PI);
        this.targetRotation = this.currentRotation;
        
        this.interactable = this.getSceneObject().getComponent(Interactable.getTypeName());
        
        if (!this.interactable) {
            print("LanternYAxisRotation: ERROR - No Interactable component found on this object.");
            return;
        }
        
        this.interactable.onDragStart.add((event) => {
            print("LanternYAxisRotation: Drag started");
        });
        
        this.interactable.onDragUpdate.add((event) => {
            const dragX = event.dragVector.x;
            this.targetRotation += dragX * this.rotationSpeed;
        });
        
        this.interactable.onDragEnd.add((event) => {
            print("LanternYAxisRotation: Drag ended");
        });
        
        print("LanternYAxisRotation: Initialized successfully");
    }
    
    onUpdate() {
        if (Math.abs(this.targetRotation - this.currentRotation) > 0.01) {
            this.currentRotation = this.currentRotation + (this.targetRotation - this.currentRotation) * this.smoothing;
            
            const transform = this.getSceneObject().getTransform();
            const currentRot = transform.getLocalRotation().toEulerAngles();
            
            transform.setLocalRotation(quat.fromEulerAngles(
                currentRot.x,
                this.currentRotation * (Math.PI / 180),
                currentRot.z
            ));
        }
    }
}
