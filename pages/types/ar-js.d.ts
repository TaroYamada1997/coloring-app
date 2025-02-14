declare module '@ar-js-org/ar.js/three.js/build/ar-threex' {
    export class ArToolkitSource {
      constructor(params: {
        sourceType: string;
        sourceWidth?: number;
        sourceHeight?: number;
        displayWidth?: number;
        displayHeight?: number;
      });
      init(callback: () => void): void;
      ready: boolean;
      domElement: HTMLElement;
      onResizeElement(): void;
      copyElementSizeTo(element: HTMLElement): void;
    }
  
    export class ArToolkitContext {
      constructor(params: {
        cameraParametersUrl: string;
        detectionMode: string;
        maxDetectionRate?: number;
        canvasWidth?: number;
        canvasHeight?: number;
      });
      init(callback: () => void): void;
      update(domElement: HTMLElement): void;
      getProjectionMatrix(): THREE.Matrix4;
      arController: {
        canvas: HTMLCanvasElement;
      } | null;
    }
  
    export class ArMarkerControls {
      constructor(
        context: ArToolkitContext,
        object3d: THREE.Object3D,
        params: {
          type: string;
          patternUrl: string;
          changeMatrixMode?: string;
        }
      );
    }
  }