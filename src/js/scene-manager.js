import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// 场景管理器 - 负责Three.js场景、相机、渲染器和光源的管理
export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.lights = [];
        this.model = null;
    }

    // 初始化场景
    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.setupLights();
    }

    // 创建场景
    createScene() {
        this.scene = new THREE.Scene();
        // 设置场景背景色为深色，确保天空球可见
        this.scene.background = new THREE.Color(0x000000);
        this.createSkyAndHorizon();
    }

    // 创建天空和地平线效果
    createSkyAndHorizon() {
        // 创建动态地平线效果
        this.createDynamicHorizon();
        // 创建地平线网格
        this.createHorizonGrid();
    }

    // 创建动态地平线效果
    createDynamicHorizon() {
        // 创建全屏四边形几何体
        const geometry = new THREE.PlaneGeometry(2, 2);
        
        // 创建着色器材质
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            uniform vec3 skyColor;
            uniform vec3 groundColor;
            uniform float cameraRotationX;
            uniform float transitionWidth;
            varying vec2 vUv;
            
            void main() {
                // 将UV坐标转换为屏幕坐标 (-1 到 1)
                vec2 screenPos = vUv * 2.0 - 1.0;
                
                // 计算地平线位置（基于相机的俯仰角）
                // cameraRotationX: 0 = 水平, π/2 = 向上, -π/2 = 向下
                // 将相机角度映射到屏幕坐标 (-1 到 1)
                float horizonY = -cameraRotationX * (2.0 / 1.5708); // 1.5708 ≈ π/2
                
                // 限制地平线位置在屏幕范围内
                horizonY = clamp(horizonY, -1.0, 1.0);
                
                // 根据Y坐标决定颜色，使用可调节的过渡宽度
                // screenPos.y > horizonY 时显示天空色，否则显示地面色
                float factor = smoothstep(horizonY - transitionWidth, horizonY + transitionWidth, screenPos.y);
                vec3 color = mix(groundColor, skyColor, factor);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        
        this.horizonMaterial = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                skyColor: { value: new THREE.Color(0x87CEEB) },
                groundColor: { value: new THREE.Color(0xD2B48C) },
                cameraRotationX: { value: 0.0 },
                transitionWidth: { value: 0.1 }
            },
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        
        this.horizonMesh = new THREE.Mesh(geometry, this.horizonMaterial);
        this.horizonMesh.renderOrder = -1000; // 确保最先渲染
        this.horizonMesh.frustumCulled = false;
        
        this.scene.add(this.horizonMesh);
        
        // 设置场景背景为黑色，让动态地平线可见
        this.scene.background = new THREE.Color(0x000000);
    }
    
    // 更新动态地平线
    updateDynamicHorizon() {
        if (!this.horizonMaterial || !this.camera) return;
        
        // 计算相机的俯仰角（绕X轴的旋转）
        const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
        this.horizonMaterial.uniforms.cameraRotationX.value = euler.x;
    }

    // 创建天空球（保留原方法作为备用）
    createSkyDome() {
        const skyGeometry = new THREE.SphereGeometry(800, 32, 15);
        
        // 使用简单的渐变材质
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // 创建明显的天空地面分界线效果
        const halfHeight = canvas.height / 2;
        
        // 上半部分 - 天空色
        context.fillStyle = '#87CEEB';  // 天空蓝
        context.fillRect(0, 0, canvas.width, halfHeight);
        
        // 下半部分 - 地面色
        // context.fillStyle = '#D2B48C';  // 浅棕色地面
        context.fillStyle = '#87CEEB';  // 天空蓝
        context.fillRect(0, halfHeight, canvas.width, halfHeight);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.UVMapping;  // 使用标准UV映射
        texture.flipY = true;  // 翻转Y轴以正确显示
        
        const skyMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide,
            fog: false  // 确保天空不受雾效影响
        });
        
        this.skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
        this.skyDome.renderOrder = -1;  // 确保天空球最先渲染
        this.scene.add(this.skyDome);
        
        // 设置场景背景为天空球纹理
        this.scene.background = texture;
        
        // 存储canvas和context用于后续颜色更新
        this.skyCanvas = canvas;
        this.skyContext = context;
        this.skyTexture = texture;
    }

    // 创建地平线网格
    createHorizonGrid() {
        const gridGroup = new THREE.Group();
        
        // 主网格 - 较粗的线
        const mainGridSize = 100;
        const mainGridDivisions = 20;
        const mainGrid = new THREE.GridHelper(mainGridSize, mainGridDivisions, 0x888888, 0x888888);
        mainGrid.material.opacity = 0.3;
        mainGrid.material.transparent = true;
        gridGroup.add(mainGrid);
        
        // 细网格 - 较细的线
        const fineGridSize = 100;
        const fineGridDivisions = 100;
        const fineGrid = new THREE.GridHelper(fineGridSize, fineGridDivisions, 0xcccccc, 0xcccccc);
        fineGrid.material.opacity = 0.1;
        fineGrid.material.transparent = true;
        gridGroup.add(fineGrid);
        
        // 坐标轴
        const axesHelper = new THREE.AxesHelper(10);
        gridGroup.add(axesHelper);
        
        // 地平面 - 半透明平面
        const planeGeometry = new THREE.PlaneGeometry(200, 200);
        const planeMaterial = new THREE.MeshLambertMaterial({
            color: 0xf0f0f0,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.position.y = -0.01; // 稍微低于网格，避免z-fighting
        groundPlane.receiveShadow = true;
        gridGroup.add(groundPlane);
        
        this.horizonGrid = gridGroup;
        this.scene.add(this.horizonGrid);
    }

    // 创建相机 - 配置为两点透视
    createCamera() {
        // 获取容器尺寸，如果没有容器则使用默认值
        const container = document.querySelector('.viewer-container');
        const width = container ? container.clientWidth : 800;
        const height = container ? container.clientHeight : 600;
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            width / height,
            0.01,  // 近平面设置为0.01，允许更近距离观察
            2000   // 增加远平面距离，确保天空球可见
        );
        // 两点透视：相机位置稍微偏离中心，保持水平视线
        this.camera.position.set(10, 10, 10);  // 调整相机位置，确保能看到天空和模型
        this.camera.lookAt(0, 0, 0);  // 看向场景中心
        this.camera.up.set(0, 1, 0);  // 确保上向量垂直向上，保持垂直线垂直
    }

    // 创建渲染器
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            // canvas: document.getElementById('canvas'),
            antialias: true,
            logarithmicDepthBuffer: true  // 启用对数深度缓冲，提高深度精度
        });
        
        // 获取容器尺寸，如果没有容器则使用默认值
        const container = document.querySelector('.viewer-container');
        const width = container ? container.clientWidth : 800;
        const height = container ? container.clientHeight : 600;
        
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5;  // 增加曝光度，让场景更亮
        this.renderer.physicallyCorrectLights = true;  // 启用物理正确的光照

        // 启用深度测试和深度写入，防止Z-fighting
        this.renderer.sortObjects = true;
        this.renderer.autoClear = true;
    }

    // 创建轨道控制器
    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 0.001;
        this.controls.maxDistance = Infinity;
        this.controls.maxPolarAngle = Math.PI;

        // 完全禁用OrbitControls的所有交互，使用自定义控制
        this.controls.enableZoom = false;
        this.controls.enableRotate = false;
        this.controls.enablePan = false;
        this.controls.enabled = false;  // 完全禁用OrbitControls
    }

    // 设置光源 - 参考SketchUp的光源配置
    setupLights() {
        // 清除现有光源
        this.lights.forEach(light => {
            this.scene.remove(light);
        });
        this.lights = [];

        // 1. 环境光 - 提供基础照明，模拟天空光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);

        // 2. 主光源 - 模拟太阳光，从右上方照射
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(10, 10, 5);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.camera.near = 0.1;
        sunLight.shadow.camera.far = 100;
        sunLight.shadow.camera.left = -20;
        sunLight.shadow.camera.right = 20;
        sunLight.shadow.camera.top = 20;
        sunLight.shadow.camera.bottom = -20;
        sunLight.shadow.bias = -0.0001;
        this.scene.add(sunLight);
        this.lights.push(sunLight);

        // 3. 补光1 - 从左侧提供柔和补光
        const fillLight1 = new THREE.DirectionalLight(0xb3d9ff, 0.6);
        fillLight1.position.set(-8, 6, 3);
        this.scene.add(fillLight1);
        this.lights.push(fillLight1);

        // 4. 补光2 - 从后方提供轮廓光
        const fillLight2 = new THREE.DirectionalLight(0xfff2cc, 0.4);
        fillLight2.position.set(0, 5, -8);
        this.scene.add(fillLight2);
        this.lights.push(fillLight2);

        // 5. 底部反射光 - 模拟地面反射
        const bottomLight = new THREE.DirectionalLight(0xe6f3ff, 0.3);
        bottomLight.position.set(0, -5, 0);
        this.scene.add(bottomLight);
        this.lights.push(bottomLight);

        // 6. 半球光 - 提供天空和地面的颜色渐变
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x87ceeb, 0.3);
        hemisphereLight.position.set(0, 20, 0);
        this.scene.add(hemisphereLight);
        this.lights.push(hemisphereLight);
    }

    // 添加模型到场景
    addModel(model) {
        if (this.model) {
            this.scene.remove(this.model);
        }
        this.model = model;
        this.scene.add(model);
    }

    // 移除当前模型
    removeModel() {
        if (this.model) {
            this.scene.remove(this.model);
            this.model = null;
        }
    }

    // 清除场景
    clearScene() {
        this.removeModel();
        // 清除其他场景对象如果需要
    }

    // 窗口大小变化处理
    onWindowResize() {
        if (this.camera && this.renderer) {
            // 获取容器尺寸
            const container = document.querySelector('.viewer-container');
            const width = container ? container.clientWidth : 800;
            const height = container ? container.clientHeight : 600;
            
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }

    // 渲染场景
    render() {
        if (this.renderer && this.scene && this.camera) {
            // 更新动态地平线
            this.updateDynamicHorizon();
            
            // 渲染场景
            this.renderer.render(this.scene, this.camera);
        }
    }

    // 获取器方法
    getScene() { return this.scene; }
    getCamera() { return this.camera; }
    getRenderer() { return this.renderer; }
    getControls() { return this.controls; }
    getLights() { return this.lights; }
    getModel() { return this.model; }

    // 设置器方法
    setModel(model) {
        this.addModel(model);
    }

    // 切换光源
    toggleLights(enabled) {
        this.lights.forEach(light => {
            light.visible = enabled;
        });
    }

    // 切换天空显示
    toggleSky(visible) {
        if (this.skyDome) {
            this.skyDome.visible = visible;
        }
    }

    // 切换地平线网格显示
    toggleHorizonGrid(visible) {
        if (this.horizonGrid) {
            this.horizonGrid.visible = visible;
        }
    }

    // 调整天空颜色
    adjustSkyColors(topColor = 0x87CEEB, bottomColor = 0x87CEEB) {
        if (this.horizonMaterial) {
            // 更新动态地平线的颜色
            if (typeof topColor === 'string') {
                this.horizonMaterial.uniforms.skyColor.value.setHex(parseInt(topColor.replace('#', ''), 16));
            } else {
                this.horizonMaterial.uniforms.skyColor.value.setHex(topColor);
            }
            
            if (typeof bottomColor === 'string') {
                this.horizonMaterial.uniforms.groundColor.value.setHex(parseInt(bottomColor.replace('#', ''), 16));
            } else {
                this.horizonMaterial.uniforms.groundColor.value.setHex(bottomColor);
            }
        }
        
        // 保留原有天空球的颜色更新逻辑（如果存在）
        if (this.skyCanvas && this.skyContext && this.skyTexture) {
            const topColorObj = new THREE.Color(topColor);
            const bottomColorObj = new THREE.Color(bottomColor);
            const halfHeight = this.skyCanvas.height / 2;
            
            // 重新绘制两色分界线效果
            // 上半部分 - 天空色
            this.skyContext.fillStyle = `#${topColorObj.getHexString()}`;
            this.skyContext.fillRect(0, 0, this.skyCanvas.width, halfHeight);
            
            // 下半部分 - 地面色
            this.skyContext.fillStyle = `#${bottomColorObj.getHexString()}`;
            this.skyContext.fillRect(0, halfHeight, this.skyCanvas.width, halfHeight);
            
            // 更新纹理和场景背景
            this.skyTexture.needsUpdate = true;
            this.scene.background = this.skyTexture;
        }
    }

    // 调整天空渐变（现在用于控制地平线过渡效果）
    adjustSkyGradient(sensitivity = 0.5) {
        if (this.horizonMaterial) {
            // 更新地平线过渡的敏感度
            // sensitivity值越大，地平线过渡越平滑
            const transitionWidth = 0.005 + (sensitivity * 0.05);
            this.horizonMaterial.uniforms.transitionWidth.value = transitionWidth;
        }
        
        // 保留原有逻辑作为备用（如果存在天空球）
        if (this.skyCanvas && this.skyContext && this.skyTexture) {
            // 清除画布
            this.skyContext.clearRect(0, 0, this.skyCanvas.width, this.skyCanvas.height);
            
            // 根据sensitivity计算天空和地面的比例
            const skyHeight = this.skyCanvas.height * sensitivity;
            const groundHeight = this.skyCanvas.height * (1 - sensitivity);
            
            // 重新绘制两色分界线效果
            // 上半部分 - 天空色
            this.skyContext.fillStyle = '#87CEEB';
            this.skyContext.fillRect(0, 0, this.skyCanvas.width, skyHeight);
            
            // 下半部分 - 地面色
            // this.skyContext.fillStyle = '#D2B48C';
            this.skyContext.fillStyle = '#87CEEB';
            this.skyContext.fillRect(0, skyHeight, this.skyCanvas.width, groundHeight);
            
            // 更新纹理和场景背景
            this.skyTexture.needsUpdate = true;
            this.scene.background = this.skyTexture;
        }
    }

    // 调整网格透明度
    adjustGridOpacity(mainOpacity = 0.3, fineOpacity = 0.1) {
        if (this.horizonGrid) {
            this.horizonGrid.children.forEach((child, index) => {
                if (child.isGridHelper) {
                    if (index === 0) { // 主网格
                        child.material.opacity = mainOpacity;
                    } else if (index === 1) { // 细网格
                        child.material.opacity = fineOpacity;
                    }
                }
            });
        }
    }

    // 调整整体光源亮度
    adjustLightIntensity(multiplier = 1.0) {
        this.lights.forEach(light => {
            if (light.isDirectionalLight || light.isPointLight || light.isSpotLight) {
                light.intensity *= multiplier;
            } else if (light.isAmbientLight || light.isHemisphereLight) {
                light.intensity *= multiplier;
            }
        });
        console.log(`光源亮度已调整，倍数: ${multiplier}`);
    }

    // 设置环境光亮度
    setAmbientLightIntensity(intensity) {
        this.lights.forEach(light => {
            if (light.isAmbientLight) {
                light.intensity = intensity;
            }
        });
    }

    // 重置光源到默认设置
    resetLights() {
        this.setupLights();
        console.log('光源已重置为默认设置');
    }

    // 切换线框模式
    toggleWireframe(enabled) {
        if (this.model) {
            this.model.traverse(function (child) {
                if (child.isMesh && child.material) {
                    child.material.wireframe = enabled;
                }
            });
        }
    }

    // 获取模型边界盒
    getModelBoundingBox() {
        if (this.model) {
            return new THREE.Box3().setFromObject(this.model);
        }
        return null;
    }

    // 获取模型中心点
    getModelCenter() {
        const box = this.getModelBoundingBox();
        return box ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3();
    }

    // 获取模型尺寸
    getModelSize() {
        const box = this.getModelBoundingBox();
        return box ? box.getSize(new THREE.Vector3()) : new THREE.Vector3();
    }
}