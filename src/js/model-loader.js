import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

// 模型加载器 - 负责GLB和OBJ模型的加载和处理
export class ModelLoader {
    constructor(sceneManager,cameraController) {
        this.sceneManager = sceneManager;
        this.currentModel = null;
        this.mixer = null; // 动画混合器
        this.cameraController=cameraController;
    }

    // 清除当前模型
    clearCurrentModel() {
        this.sceneManager.removeModel();
        if (this.mixer) {
            this.mixer = null;
        }
    }

    // 处理模型通用设置
    setupModel(loadedModel) {
        // 设置模型属性
        loadedModel.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // 确保材质正确设置，渲染正面和背面
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        // 渲染模型的正面和背面，以避免背面剔除问题
                        material.side = THREE.DoubleSide;

                        // 添加polygonOffset来避免Z-fighting（深度冲突）
                        material.polygonOffset = true;
                        material.polygonOffsetFactor = 1;
                        material.polygonOffsetUnits = 1;

                        material.needsUpdate = true;
                    });
                }

                // 确保几何体法向量正确，避免背面显示问题
                if (child.geometry) {
                    child.geometry.computeVertexNormals();
                }
            }
        });

        // 计算模型边界盒，用于居中和缩放
        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // 保持模型原始尺寸，不进行自动缩放
        const maxDim = Math.max(size.x, size.y, size.z);
        console.log('模型尺寸:', size, '最大维度:', maxDim);
        console.log('模型保持原始尺寸，相机配置将通过cameraConfigUrl设置');

        this.sceneManager.addModel(loadedModel);

        // 动态调整相机的near和far参数以避免模型被裁剪
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();

        if (camera) {
            // 基于模型原始尺寸设置相机参数
            const minNear = Math.min(0.1, maxDim * 0.01);
            const maxFar = Math.max(1000, maxDim * 100);
            camera.near = Math.max(0.001, minNear);
            camera.far = maxFar;
            camera.updateProjectionMatrix();

            // 更新控制器的距离限制
            if (controls) {
                controls.minDistance = Math.max(0.01, maxDim * 0.01);
                controls.maxDistance = Math.max(100, maxDim * 50);
                controls.update();
            }
        }

        // 如果已有相机数据，重新应用相机设置
        if (window.lastCameraData) {
            console.log('模型加载完成，重新应用SketchUp相机设置...');
            try {
                this.cameraController.setCameraFromJSON_Method4(window.lastCameraData);
                console.log('相机参数重新加载成功');
            } catch (error) {
                console.error('重新加载相机参数失败:', error);
            }
        }
    }

    // 加载GLB模型
    loadGLBModel(modelPath) {
        this.clearCurrentModel();

        const loader = new THREE.GLTFLoader();

        loader.load(
            modelPath,
            (gltf) => {
                console.log('GLB模型加载成功:', gltf);

                this.setupModel(gltf.scene);

                // 如果模型包含动画，设置动画混合器
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(this.sceneManager.getModel());
                    gltf.animations.forEach((clip) => {
                        this.mixer.clipAction(clip).play();
                    });
                }
            },
            (progress) => {
                const progressPercent = progress.loaded / progress.total;
                const progressValue = Math.round(progressPercent * 1000) / 10; // 限制到小数点后一位
                console.log('GLB加载进度:', progressValue + '%');
            },
            (error) => {
                console.error('GLB模型加载失败:', error);
            }
        );
    }

    // 加载OBJ模型
    loadOBJModel(modelPath, onProgress) {
        let materialPath = null;
        // 如果没有提供materialPath，则根据modelPath生成同名的.mtl文件路径
        if (!materialPath && modelPath) {
            materialPath = modelPath.replace('.obj', '.mtl');
        }
        this.clearCurrentModel();

        const objLoader = new OBJLoader();

        // 如果提供了材质文件路径，先加载材质
        if (materialPath) {
            const mtlLoader = new MTLLoader();
            mtlLoader.load(
                materialPath,
                (materials) => {
                    materials.preload();
                    objLoader.setMaterials(materials);
                    this.loadOBJFile(objLoader, modelPath, onProgress, true);
                },
                (progress) => {
                    const progressPercent = progress.loaded / progress.total * 0.1; // MTL占总进度的30%
                    const progressValue = Math.round(progressPercent * 1000) / 10; // 限制到小数点后一位
                    console.log('MTL材质加载进度:', progressValue + '%');
                },
                (error) => {
                    console.error('MTL材质加载失败:', error);
                    // 即使材质加载失败，也尝试加载OBJ文件
                    this.loadOBJFile(objLoader, modelPath, onProgress);
                }
            );
        } else {
            this.loadOBJFile(objLoader, modelPath, onProgress);
        }
    }

    // 加载OBJ文件的具体实现
    loadOBJFile(objLoader, modelPath, onProgress, hasMaterial = false) {
        objLoader.load(
            modelPath,
            (object) => {
                console.log('OBJ模型加载成功:', object);

                // 如果没有材质，为模型添加默认材质
                object.traverse(function (child) {
                    if (child.isMesh && !child.material) {
                        child.material = new THREE.MeshLambertMaterial({
                            color: 0x888888,
                            side: THREE.DoubleSide, // 渲染正面和背面
                            polygonOffset: true,
                            polygonOffsetFactor: 1,
                            polygonOffsetUnits: 1
                        });
                    }

                    // 确保几何体法向量正确，避免背面显示问题
                    if (child.geometry) {
                        child.geometry.computeVertexNormals();
                    }
                });

                this.setupModel(object);
            },
            (progress) => {
                const baseProgress = hasMaterial ? 0.1 : 0; // 如果有MTL，OBJ从10%开始，否则从0%开始
                const progressRange = hasMaterial ? 0.9 : 1.0; // 如果有MTL，OBJ占70%，否则占100%
                const progressPercent = baseProgress + (progress.loaded / progress.total * progressRange);
                const progressValue = Math.round(progressPercent * 1000) / 10; // 限制到小数点后一位
                console.log('OBJ加载进度:', progressValue + '%');
                onProgress(progressValue);
            },
            (error) => {
                console.error('OBJ模型加载失败:', error);
            }
        );
    }

    // 通过文件扩展名自动选择加载器
    loadModel(modelPath, materialPath = null) {
        const extension = modelPath.split('.').pop().toLowerCase();

        switch (extension) {
            case 'glb':
            case 'gltf':
                this.loadGLBModel(modelPath);
                break;
            case 'obj':
                this.loadOBJModel(modelPath, materialPath);
                break;
            default:
                console.error('不支持的模型格式:', extension);
                alert('不支持的模型格式: ' + extension + '\n支持的格式: GLB, GLTF, OBJ');
        }
    }

    // 获取动画混合器
    getMixer() {
        return this.mixer;
    }

    // 设置动画混合器
    setMixer(mixer) {
        this.mixer = mixer;
    }
}