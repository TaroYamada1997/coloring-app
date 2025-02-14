import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ArMarkerControls, ArToolkitContext, ArToolkitSource } from '@ar-js-org/ar.js/three.js/build/ar-threex';

interface ARCameraProps {
  canvasImage: string;
}

export default function ARCamera({ canvasImage }: ARCameraProps) {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    // AR.js の初期化
    const arToolkitSource = new ArToolkitSource({
      sourceType: 'webcam',
      sourceWidth: window.innerWidth,
      sourceHeight: window.innerHeight,
      displayWidth: window.innerWidth,
      displayHeight: window.innerHeight,
    });

    // カメラソースの初期化
    arToolkitSource.init(() => {
      // カメラの準備ができたらリサイズを実行
      setTimeout(() => {
        onResize();
      }, 200);
    });

    // リサイズハンドラ
    const onResize = () => {
      arToolkitSource.onResizeElement();
      arToolkitSource.copyElementSizeTo(renderer.domElement);
      if (arToolkitContext.arController !== null) {
        arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
      }
    };

    window.addEventListener('resize', onResize);

    // シーンの設定
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    sceneRef.current.appendChild(renderer.domElement);

    // AR コンテキストの初期化
    const arToolkitContext = new ArToolkitContext({
      cameraParametersUrl: '/camera_para.dat',
      detectionMode: 'mono',
      maxDetectionRate: 60,
      canvasWidth: window.innerWidth,
      canvasHeight: window.innerHeight,
    });

    arToolkitContext.init(() => {
      camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
    });

    // マーカーの設定
    const markerRoot = new THREE.Group();
    scene.add(markerRoot);

    new ArMarkerControls(arToolkitContext, markerRoot, {
      type: 'pattern',
      patternUrl: '/pattern-marker.patt',
      changeMatrixMode: 'cameraTransformMatrix'
    });

    // 色塗りした画像をテクスチャとして使用
    const texture = new THREE.TextureLoader().load(canvasImage);
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    markerRoot.add(mesh);

    // アニメーションループ
    const animate = () => {
      requestAnimationFrame(animate);

      if (arToolkitSource.ready) {
        arToolkitContext.update(arToolkitSource.domElement);
      }

      renderer.render(scene, camera);
    };

    animate();

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', onResize);
      if (sceneRef.current) {
        sceneRef.current.removeChild(renderer.domElement);
      }
    };
  }, [canvasImage]);

  return (
    <div 
      ref={sceneRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 1000,
        backgroundColor: 'transparent',
      }}
    />
  );
}
