import * as THREE from 'three'
// 相机控制器 - 负责相机的各种操作和配置
export class CameraController {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.lastCameraPosition = new THREE.Vector3();
        this.lastCameraRotation = new THREE.Euler();
        this.lastControlsTarget = new THREE.Vector3();
    }

    // 辅助函数：测试不同的单位转换系数
    testUnitScales(cameraData) {
        const scales = {
            '英寸到米': 0.0254,
            '厘米到米': 0.01,
            '毫米到米': 0.001,
            '英尺到米': 0.3048,
            '无转换': 1.0,
            '自定义1': 0.1,
            '自定义2': 0.5
        };

        console.log('\n=== 单位转换测试 ===');
        console.log('原始相机数据:', cameraData);
        
        const originalDistance = Math.sqrt(
            Math.pow(cameraData.position[0] - cameraData.target[0], 2) +
            Math.pow(cameraData.position[1] - cameraData.target[1], 2) +
            Math.pow(cameraData.position[2] - cameraData.target[2], 2)
        );
        
        console.log('原始距离:', originalDistance);
        console.log('\n测试不同转换系数的结果:');
        
        Object.entries(scales).forEach(([name, scale]) => {
            const scaledDistance = originalDistance * scale;
            console.log(`${name} (${scale}): 转换后距离 = ${scaledDistance.toFixed(4)}`);
        });
        
        console.log('\n使用方法:');
        console.log('1. 在SketchUp中记录实际的相机距离');
        console.log('2. 找到最接近的转换系数');
        console.log('3. 在相机数据中添加 "unit_scale" 字段');
        console.log('4. 重新导入相机参数');
    }

    // 更新相机状态
    update() {
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();

        if (!camera || !controls) return;

        // 检测相机参数变化并打印
        const currentPosition = camera.position.clone();
        const currentRotation = camera.rotation.clone();
        const currentTarget = controls.target.clone();

        // 检查是否有变化（使用较小的阈值来避免浮点数精度问题）
        const positionChanged = !currentPosition.equals(this.lastCameraPosition);
        const rotationChanged = !currentRotation.equals(this.lastCameraRotation);
        const targetChanged = !currentTarget.equals(this.lastControlsTarget);

        if (positionChanged || rotationChanged || targetChanged) {
            // 更新上次记录的状态
            this.lastCameraPosition.copy(currentPosition);
            this.lastCameraRotation.copy(currentRotation);
            this.lastControlsTarget.copy(currentTarget);
        }
    }

    // 缩放到当前范围功能
    fitToView() {
        console.log('fitToView函数被调用');

        const model = this.sceneManager.getModel();
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();

        console.log('model:', model);
        console.log('camera:', camera);
        console.log('controls:', controls);

        if (!model || !camera || !controls) {
            console.log('缺少必要的对象，退出fitToView');
            return;
        }

        // 计算模型的边界盒
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        console.log('模型中心:', center);
        console.log('模型尺寸:', size);

        // 获取模型的最大尺寸
        const maxDim = Math.max(size.x, size.y, size.z);
        console.log('最大尺寸:', maxDim);

        // 计算理想的相机距离
        const fov = camera.fov * Math.PI / 180;
        const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.2; // 1.2倍距离确保有边距
        console.log('计算的距离:', distance);

        // 设置相机位置
        const direction = camera.position.clone().sub(center).normalize();
        const newPosition = center.clone().add(direction.multiplyScalar(distance));
        console.log('新相机位置:', newPosition);

        camera.position.copy(newPosition);

        // 更新控制器目标
        controls.target.copy(center);

        console.log('fitToView执行完成');

        // 平滑动画到新位置
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
    }

    // 重置相机到默认位置 - 两点透视
    resetCameraToDefault() {
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();

        if (!camera || !controls) return;

        // 两点透视：相机位置保持水平，稍微偏离中心
        camera.position.set(8, 0, 8);  // X和Z轴偏移，Y轴为0保持水平
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0);  // 确保上向量垂直向上

        controls.target.set(0, 0, 0);

        console.log('相机已重置到两点透视默认位置');
    }

    // 方案2: SketchUp (X,Y,Z) -> Three.js (X,Z,-Y)
    setCameraFromJSON_Method2(cameraData) {
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();

        if (!camera || !controls) {
            console.error('相机或控制器未初始化');
            return;
        }

        // 验证相机数据
        if (!cameraData) {
            console.error('相机数据为空');
            return;
        }

        if (!cameraData.position || !Array.isArray(cameraData.position) || cameraData.position.length !== 3) {
            console.error('position字段无效或缺失');
            return;
        }

        if (!cameraData.target || !Array.isArray(cameraData.target) || cameraData.target.length !== 3) {
            console.error('target字段无效或缺失');
            return;
        }

        const position = cameraData.position;
        const convertedPosition = {
            x: position[0],
            y: position[2],  // SketchUp的Z -> Three.js的Y
            z: -position[1]  // SketchUp的Y -> Three.js的-Z
        };

        const target = cameraData.target;
        const convertedTarget = {
            x: target[0],
            y: target[2],
            z: -target[1]
        };

        let convertedUp = { x: 0, y: 1, z: 0 };
        if (cameraData.up_vector) {
            const up = cameraData.up_vector;
            convertedUp = {
                x: up[0],
                y: up[2],
                z: -up[1]
            };
        }

        camera.position.set(convertedPosition.x, convertedPosition.y, convertedPosition.z);
        camera.up.set(convertedUp.x, convertedUp.y, convertedUp.z);
        camera.lookAt(convertedTarget.x, convertedTarget.y, convertedTarget.z);

        if (cameraData.field_of_view) {
            camera.fov = cameraData.field_of_view;
        }

        // 设置焦距（focal length）
        if (cameraData.focal_length && camera.isPerspectiveCamera) {
            camera.filmGauge = 35; // 35mm胶片
            camera.focalLength = cameraData.focal_length;
            console.log('焦距已设置为:', cameraData.focal_length, 'mm');
        } else if (cameraData.focal_length) {
            console.warn('警告: 只有透视相机支持焦距设置');
        }

        camera.updateProjectionMatrix();

        controls.target.set(convertedTarget.x, convertedTarget.y, convertedTarget.z);

        console.log('相机参数已更新 (方案2 - SketchUp坐标转换):', {
            original: {
                position: cameraData.position,
                target: cameraData.target,
                up: cameraData.up_vector,
                focal_length: cameraData.focal_length
            },
            converted: {
                position: convertedPosition,
                target: convertedTarget,
                up: convertedUp
            },
            fov: camera.fov,
            focalLength: camera.focalLength,
            filmGauge: camera.filmGauge
        });
    }

    // 方案4: 坐标转换方案（修复单位转换问题）
    setCameraFromJSON_Method4(cameraDataOrigin) {
        let cameraData = cameraDataOrigin;
        if (cameraDataOrigin.current_camera) {
            cameraData = cameraDataOrigin.current_camera;
        }
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();

        if (!camera || !controls) {
            console.error('相机或控制器未初始化');
            return;
        }

        // 验证相机数据
        if (!cameraData) {
            console.error('相机数据为空');
            return;
        }

        if (!cameraData.position || !Array.isArray(cameraData.position) || cameraData.position.length !== 3) {
            console.error('position字段无效或缺失');
            return;
        }

        if (!cameraData.target || !Array.isArray(cameraData.target) || cameraData.target.length !== 3) {
            console.error('target字段无效或缺失');
            return;
        }

        // 单位转换系数：SketchUp默认使用英寸，Three.js使用米
        // 1英寸 = 0.0254米，但根据实际测试可能需要调整
        const unitScale = cameraData.unit_scale || 25.4; // 默认英寸到米的转换
        console.log('使用单位转换系数:', unitScale);

        const position = cameraData.position;
        const convertedPosition = {
            x: position[0] * unitScale,
            y: position[1] * unitScale,
            z: position[2] * unitScale
        };

        const target = cameraData.target;
        const convertedTarget = {
            x: target[0] * unitScale,
            y: target[1] * unitScale,
            z: target[2] * unitScale
        };

        // 处理up_vector，如果不存在则使用默认值
        const up = cameraData.up_vector || [0, 1, 0];
        if (!Array.isArray(up) || up.length !== 3) {
            console.warn('up_vector字段无效，使用默认值 [0, 1, 0]');
            up = [0, 1, 0];
        }
        const convertedUp = {
            x: up[0],
            y: up[1],
            z: up[2]
        };

        camera.position.set(convertedPosition.x, convertedPosition.y, convertedPosition.z);
        camera.up.set(convertedUp.x, convertedUp.y, convertedUp.z);
        camera.lookAt(convertedTarget.x, convertedTarget.y, convertedTarget.z);

        if (cameraData.field_of_view) {
            camera.fov = cameraData.field_of_view;
            camera.updateProjectionMatrix();
            console.log('FOV已设置为:', cameraData.field_of_view);
        } else {
            console.warn('警告: 相机数据中没有field_of_view字段，使用默认FOV:', camera.fov);
        }

        // 设置焦距（focal length）
        if (cameraData.focal_length && camera.isPerspectiveCamera) {
            camera.focalLength = cameraData.focal_length;
            camera.updateProjectionMatrix();
            console.log('焦距已设置为:', cameraData.focal_length, 'mm');
        } else if (cameraData.focal_length) {
            console.warn('警告: 只有透视相机支持焦距设置');
        }

        // 确保相机是透视投影模式
        console.log('相机类型:', camera.type, '| 是否透视相机:', camera.isPerspectiveCamera);

        // 计算转换后的距离
        const convertedDistance = Math.sqrt(
            Math.pow(convertedPosition.x - convertedTarget.x, 2) +
            Math.pow(convertedPosition.y - convertedTarget.y, 2) +
            Math.pow(convertedPosition.z - convertedTarget.z, 2)
        );

        // 计算原始距离
        const originalDistance = Math.sqrt(
            Math.pow(position[0] - target[0], 2) +
            Math.pow(position[1] - target[1], 2) +
            Math.pow(position[2] - target[2], 2)
        );

        console.log('相机参数已更新 (方案4 - 修复单位转换):', {
            original: cameraData,
            unitScale: unitScale,
            originalDistance: originalDistance,
            convertedDistance: convertedDistance,
            distanceRatio: convertedDistance / originalDistance,
            converted: { position: convertedPosition, target: convertedTarget, up: convertedUp },
            currentFov: camera.fov,
            focalLength: camera.focalLength,
            filmGauge: camera.filmGauge,
            isPerspective: camera.isPerspectiveCamera,
            camera: camera,
        });

        console.log('\n=== 单位转换提示 ===');
        console.log('如果距离仍然不匹配，请尝试以下单位转换系数:');
        console.log('- 英寸到米: 0.0254');
        console.log('- 厘米到米: 0.01');
        console.log('- 毫米到米: 0.001');
        console.log('- 英尺到米: 0.3048');
        console.log('- 无转换: 1.0');
        console.log('在相机数据中添加 "unit_scale" 字段来指定转换系数');
        console.log('例如: {"unit_scale": 0.01, "position": [...], "target": [...]}');
    }

    // 添加相机测试控制
    addCameraTestControls() {
        // 防止重复添加监听器
        if (window.cameraControlsAdded) {
            console.log('键盘控制器已存在，跳过重复初始化');
            return;
        }

        console.log('键盘控制器已初始化');
        window.cameraControlsAdded = true;

        document.addEventListener('keydown', (event) => {
            // 如果焦点在表单元素上，不处理快捷键
            if (event.target.tagName === 'SELECT' || 
                event.target.tagName === 'INPUT' || 
                event.target.tagName === 'TEXTAREA' ||
                event.target.tagName === 'OPTION') {
                return;
            }
            
            console.log('按键检测到:', event.key);

            if (!window.lastCameraData) {
                console.warn('没有相机数据！请先加载包含相机配置的JSON文件。');
                return;
            }

            console.log('相机数据存在，处理按键:', event.key);

            switch (event.key) {
                case '0':
                    console.log('启动交互式坐标转换测试');
                    this.startInteractiveTransformTest(window.lastCameraData);
                    break;
                case 'r':
                case 'R':
                    console.log('重置相机到默认位置');
                    this.resetCameraToDefault();
                    break;
                case 't':
                case 'T':
                    if (window.transformTest) {
                        const test = window.transformTest;
                        let nextIndex;
                        console.log(`当前索引: ${test.currentTransformIndex}`);
                        if (event.shiftKey) {
                            // Shift+T: 上一个转换
                            nextIndex = test.currentTransformIndex - 1;
                            if (nextIndex < 0) nextIndex = test.transforms.length - 1;
                            console.log(`Shift+T: ${test.currentTransformIndex} -> ${nextIndex}`);
                        } else {
                            // T: 下一个转换
                            nextIndex = (test.currentTransformIndex + 1) % test.transforms.length;
                            console.log(`T: ${test.currentTransformIndex} -> ${nextIndex}`);
                        }
                        this.applyTransformTest(nextIndex);
                    } else {
                        console.log('请先按 0 键启动交互式测试');
                    }
                    break;
                case 'i':
                case 'I':
                    this.showCurrentTransformInfo();
                    break;
                case 'c':
                case 'C':
                    this.compareSketchUpAndThreeJS();
                    break;
                case 'h':
                case 'H':
                    console.log('=== 相机测试帮助 ===');
                    console.log('按 1-9 键: 测试不同的相机坐标转换方案');
                    console.log('按 0 键: 启动交互式坐标转换测试');
                    console.log('按 T 键: 切换到下一个转换方案 (仅在交互式测试中)');
                    console.log('按 Shift+T 键: 切换到上一个转换方案 (仅在交互式测试中)');
                    console.log('按 I 键: 显示当前转换信息 (仅在交互式测试中)');
                    console.log('按 C 键: 比较SketchUp和Three.js数值 (仅在交互式测试中)');
                    console.log('按 R 键: 重置相机到默认位置');
                    console.log('按 S 键: 切换到下一个场景 (如果有场景数据)');
                    console.log('按 1-9 键: 快速切换到对应场景 (如果有场景数据)');
                    console.log('按 H 键: 显示此帮助信息');
                    console.log('当前相机数据状态:', window.lastCameraData ? '已加载' : '未加载');
                    console.log('交互式测试状态:', window.transformTest ? '已启动' : '未启动');
                    
                    // 显示场景信息
                    if (window.cameraConfigLoader && window.cameraConfigLoader.getAllScenes) {
                        const scenes = window.cameraConfigLoader.getAllScenes();
                        if (scenes.length > 0) {
                            console.log(`场景数据状态: 已加载 ${scenes.length} 个场景`);
                            scenes.forEach((scene, index) => {
                                console.log(`  ${index + 1}. ${scene.name || `场景${scene.index}`}`);
                            });
                        } else {
                            console.log('场景数据状态: 未加载');
                        }
                    }
                    break;
                default:
                    console.log('切换到方案4: 深度分析和调试相机转换');
                    this.setCameraFromJSON_Method4(window.lastCameraData);
                    break;
            }
        });

        // 添加焦点确保键盘事件能被捕获，但不影响下拉框等表单元素
        document.addEventListener('click', function (event) {
            // 如果点击的是表单元素（如select、input等），不要强制设置焦点到body
            if (event.target.tagName === 'SELECT' || 
                event.target.tagName === 'INPUT' || 
                event.target.tagName === 'TEXTAREA' ||
                event.target.tagName === 'OPTION') {
                return;
            }
            document.body.focus();
        });

        // 确保页面有焦点
        if (document.body) {
            document.body.setAttribute('tabindex', '0');
            document.body.focus();
        }
    }

    // 交互式坐标转换测试
    startInteractiveTransformTest(cameraData) {
        if (!cameraData) {
            console.error('没有相机数据可供测试');
            return;
        }

        console.log('\n=== 交互式坐标转换测试 ===');
        console.log('原始SketchUp数据:', cameraData);

        // 创建一个全局的测试状态
        window.transformTest = {
            originalData: cameraData,
            currentTransformIndex: 0,
            transforms: [
                { name: '无转换', func: (p, s) => [p[0] * s, p[1] * s, p[2] * s] },
                { name: 'Y↔Z交换', func: (p, s) => [p[0] * s, p[2] * s, p[1] * s] },
                { name: 'Y轴反向', func: (p, s) => [p[0] * s, -p[1] * s, p[2] * s] },
                { name: 'Z轴反向', func: (p, s) => [p[0] * s, p[1] * s, -p[2] * s] },
                { name: 'Y↔Z交换+Y反向', func: (p, s) => [p[0] * s, p[2] * s, -p[1] * s] },
                { name: 'Y↔Z交换+Z反向', func: (p, s) => [p[0] * s, -p[2] * s, p[1] * s] },
                { name: 'X↔Z交换', func: (p, s) => [p[2] * s, p[1] * s, p[0] * s] },
                { name: 'X↔Y交换', func: (p, s) => [p[1] * s, p[0] * s, p[2] * s] },
                { name: 'X↔Z交换+Y反向', func: (p, s) => [p[2] * s, -p[1] * s, p[0] * s] },
                { name: 'X↔Y交换+Z反向', func: (p, s) => [p[1] * s, p[0] * s, -p[2] * s] },
                { name: '全轴反向', func: (p, s) => [-p[0] * s, -p[1] * s, -p[2] * s] },
                { name: 'X反向+Y↔Z交换', func: (p, s) => [p[0] * s, p[2] * s, p[1] * s] }
            ]
        };

        console.log('可用转换方案:');
        window.transformTest.transforms.forEach((t, i) => {
            console.log(`  ${i}: ${t.name}`);
        });

        console.log('\n使用方法:');
        console.log('- 按 T 键: 切换到下一个转换方案');
        console.log('- 按 Shift+T 键: 切换到上一个转换方案');
        console.log('- 按 I 键: 显示当前转换信息');
        console.log('- 按 C 键: 比较SketchUp和Three.js的数值');

        // 应用第一个转换
        this.applyTransformTest(0);
    }

    // 应用指定的转换测试
    applyTransformTest(index) {
        if (!window.transformTest) return;

        const test = window.transformTest;
        const transform = test.transforms[index];
        if (!transform) return;

        test.currentTransformIndex = index;
        console.log(`\n=== 应用转换 ${index}: ${transform.name} ===`);

        // 转换坐标
        const pos = transform.func(test.originalData.position);
        const target = transform.func(test.originalData.target);
        const up = transform.func(test.originalData.up_vector || [0, 0, 1]); // up向量不缩放

        console.log('转换后坐标:');
        console.log('- 位置:', pos);
        console.log('- 目标:', target);
        console.log('- 上向量:', up);

        // 计算观察方向和距离
        const direction = [target[0] - pos[0], target[1] - pos[1], target[2] - pos[2]];
        const distance = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);

        console.log('- 观察方向:', direction);
        console.log('- 观察距离:', distance);

        // 应用到相机
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();

        if (camera && controls) {
            camera.position.set(pos[0], pos[1], pos[2]);
            camera.up.set(up[0], up[1], up[2]);
            camera.lookAt(target[0], target[1], target[2]);

            controls.target.set(target[0], target[1], target[2]);

            console.log('相机已更新');
        }
    }

    // 显示当前转换信息
    showCurrentTransformInfo() {
        if (!window.transformTest) {
            console.log('没有活动的转换测试');
            return;
        }

        const test = window.transformTest;
        const current = test.transforms[test.currentTransformIndex];

        console.log('\n=== 当前转换信息 ===');
        console.log('转换方案:', `${test.currentTransformIndex}: ${current.name}`);
        console.log('SketchUp原始数据:', test.originalData);

        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();

        if (camera && controls) {
            console.log('Three.js当前状态:');
            console.log('- 相机位置:', { x: camera.position.x, y: camera.position.y, z: camera.position.z });
            console.log('- 目标位置:', { x: controls.target.x, y: controls.target.y, z: controls.target.z });
            console.log('- 上向量:', { x: camera.up.x, y: camera.up.y, z: camera.up.z });
            console.log('- FOV:', camera.fov);
        }
    }

    // 比较SketchUp和Three.js数值
    compareSketchUpAndThreeJS() {
        if (!window.transformTest) {
            console.log('没有活动的转换测试');
            return;
        }

        const original = window.transformTest.originalData;

        console.log('\n=== SketchUp vs Three.js 数值比较 ===');
        console.log('SketchUp:');
        console.log('- 相机位置:', original.position);
        console.log('- 目标位置:', original.target);
        console.log('- 上向量:', original.up_vector);
        console.log('- FOV:', original.field_of_view);

        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();

        if (camera && controls) {
            console.log('\nThree.js:');
            console.log('- 相机位置:', [camera.position.x, camera.position.y, camera.position.z]);
            console.log('- 目标位置:', [controls.target.x, controls.target.y, controls.target.z]);
            console.log('- 上向量:', [camera.up.x, camera.up.y, camera.up.z]);
            console.log('- FOV:', camera.fov);

            // 计算差异
            const posDiff = [
                Math.abs(camera.position.x - original.position[0]),
                Math.abs(camera.position.y - original.position[1]),
                Math.abs(camera.position.z - original.position[2])
            ];
            const targetDiff = [
                Math.abs(controls.target.x - original.target[0]),
                Math.abs(controls.target.y - original.target[1]),
                Math.abs(controls.target.z - original.target[2])
            ];

            console.log('\n差异分析:');
            console.log('- 位置差异:', posDiff);
            console.log('- 目标差异:', targetDiff);
            console.log('- FOV差异:', Math.abs(camera.fov - (original.field_of_view || 45)));
        }
    }
}