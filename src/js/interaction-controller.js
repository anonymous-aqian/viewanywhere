import * as THREE from 'three'
// 交互控制器 - 负责处理用户交互和自定义缩放逻辑
export class InteractionController {
    constructor(sceneManager, cameraController) {
        this.sceneManager = sceneManager;
        this.cameraController = cameraController;
        
        // SketchUp风格的交互状态
        this.isMouseDown = false;
        this.mouseButton = null;
        this.lastMousePosition = { x: 0, y: 0 };
        this.isShiftPressed = false;
        this.isCtrlPressed = false;
        
        // 旋转中心（在拖拽开始时确定，拖拽过程中保持不变）
        this.rotationCenter = null;
        this.isFirstRotation = true;
        
        // 旋转和平移的敏感度
        this.rotateSpeed = 0.005;
        this.panSpeed = 0.002;
        this.zoomSpeed = 0.1;
        
        this.setupSketchUpControls();
    }

    // 设置SketchUp风格的控制
    setupSketchUpControls() {
        var camera = this.sceneManager.getCamera();
        var controls = this.sceneManager.getControls();
        var renderer = this.sceneManager.getRenderer();
        
        if (!camera || !controls || !renderer) return;

        var canvas = renderer.domElement;
        
        // 禁用默认的OrbitControls
        controls.enabled = false;
        
        // 键盘事件监听
        document.addEventListener('keydown', (event) => {
            this.isShiftPressed = event.shiftKey;
            this.isCtrlPressed = event.ctrlKey || event.metaKey;
        });
        
        document.addEventListener('keyup', (event) => {
            this.isShiftPressed = event.shiftKey;
            this.isCtrlPressed = event.ctrlKey || event.metaKey;
        });
        
        // 鼠标按下事件
        canvas.addEventListener('mousedown', (event) => {
            event.preventDefault();
            this.isMouseDown = true;
            this.mouseButton = event.button;
            this.lastMousePosition = { x: event.clientX, y: event.clientY };
            canvas.style.cursor = this.getCursor(event.button);
            // 不在鼠标按下时设置旋转中心，避免位置跳跃
        });
        
        // 鼠标移动事件
        canvas.addEventListener('mousemove', (event) => {
            if (!this.isMouseDown) return;
            
            const deltaX = event.clientX - this.lastMousePosition.x;
            const deltaY = event.clientY - this.lastMousePosition.y;
            
            if (this.mouseButton === 0) { // 左键
                if (this.isShiftPressed) {
                    // Shift + 左键 = 平移
                    this.pan(deltaX, deltaY);
                } else {
                    // 左键 = 旋转（以固定的旋转中心）
                    if (!this.rotationCenter) {
                        // 只在第一次旋转移动时设置旋转中心
                        this.setRotationCenterFromLastPosition();
                    }
                    if (this.rotationCenter) {
                        this.rotateAroundPoint(this.rotationCenter, deltaX, deltaY);
                    } else {
                        this.rotate(deltaX, deltaY);
                    }
                }
            } else if (this.mouseButton === 1) { // 中键
                // 中键 = 平移
                this.pan(deltaX, deltaY);
            } else if (this.mouseButton === 2) { // 右键
                // 右键 = 平移（SketchUp风格）
                this.pan(deltaX, deltaY);
            }
            
            this.lastMousePosition = { x: event.clientX, y: event.clientY };
        });
        
        // 鼠标抬起事件
        canvas.addEventListener('mouseup', (event) => {
            this.isMouseDown = false;
            this.mouseButton = null;
            // 不再清除 rotationCenter，避免旋转过程中中心丢失
            // this.rotationCenter = null;
            canvas.style.cursor = 'default';
        });
        
        // 双击事件 - 聚焦到点
        canvas.addEventListener('dblclick', (event) => {
            this.focusOnPoint(event);
        });
        
        // 滚轮缩放
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            this.zoom(event);
        }, { passive: false });
        
        // 右键菜单禁用
        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }

    // 设置旋转中心（在鼠标按下时调用）
    setRotationCenter(event) {
        var camera = this.sceneManager.getCamera();
        var controls = this.sceneManager.getControls();
        var renderer = this.sceneManager.getRenderer();
        
        if (!camera || !controls || !renderer) return;

        // 获取鼠标位置
        var canvas = renderer.domElement;
        var rect = canvas.getBoundingClientRect();
        var mouse = {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1
        };
        
        // 创建射线检测旋转中心
        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        var intersects = raycaster.intersectObjects(this.sceneManager.getScene().children, true);
        
        if (intersects.length > 0) {
            // 如果射线击中了物体，使用第一个交点作为旋转中心
            this.rotationCenter = intersects[0].point.clone();
            console.log('设置旋转中心为交点:', this.rotationCenter);
        } else {
            // 如果没有击中任何物体，使用当前的相机目标作为旋转中心
            this.rotationCenter = controls.target.clone();
            console.log('未击中物体，使用当前目标点作为旋转中心:', this.rotationCenter);
        }
    }
    
    // 从当前位置设置旋转中心（避免射线检测导致的位置跳跃）
    setRotationCenterFromLastPosition() {
        var camera = this.sceneManager.getCamera();
        var controls = this.sceneManager.getControls();
        var renderer = this.sceneManager.getRenderer();
        
        if (!camera || !controls || !renderer) return;
        
        // SketchUp风格：使用屏幕中心对应的3D点作为旋转中心
        var canvas = renderer.domElement;
        var rect = canvas.getBoundingClientRect();
        
        // 屏幕中心点（NDC坐标）
        var screenCenter = { x: 0, y: 0 };
        
        // 创建射线从屏幕中心发出
        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(screenCenter, camera);
        
        // 尝试与场景中的物体相交
        var intersects = raycaster.intersectObjects(this.sceneManager.getScene().children, true);
        
        if (intersects.length > 0) {
            // 使用屏幕中心射线与模型的交点作为旋转中心
            this.rotationCenter = intersects[0].point.clone();
            console.log('设置旋转中心为屏幕中心交点:', this.rotationCenter);
        } else {
            // 如果没有交点，使用屏幕中心在当前视距上的点
            var distance = camera.position.distanceTo(controls.target);
            this.rotationCenter = raycaster.ray.origin.clone().add(
                raycaster.ray.direction.clone().multiplyScalar(distance)
            );
            console.log('设置旋转中心为屏幕中心视距点:', this.rotationCenter);
        }
    }
    
    // 围绕指定点旋转相机（SketchUp风格）
    rotateAroundPoint(center, deltaX, deltaY) {
        var camera = this.sceneManager.getCamera();
        var controls = this.sceneManager.getControls();
        
        if (!camera || !controls || !center) return;
        
        // 保存当前相机状态
        var originalPosition = camera.position.clone();
        var originalTarget = controls.target.clone();
        
        // 计算相机相对于旋转中心的位置向量
        var offset = new THREE.Vector3();
        offset.copy(camera.position).sub(center);
        
        // 获取相机的当前方向向量
        var cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // 计算相机的右向量和上向量
        var right = new THREE.Vector3();
        var up = new THREE.Vector3();
        right.crossVectors(cameraDirection, camera.up).normalize();
        up.crossVectors(right, cameraDirection).normalize();
        
        // 水平旋转（围绕上向量）
        var horizontalAngle = -deltaX * this.rotateSpeed;
        var horizontalQuaternion = new THREE.Quaternion();
        horizontalQuaternion.setFromAxisAngle(up, horizontalAngle);
        offset.applyQuaternion(horizontalQuaternion);
        
        // 垂直旋转（围绕右向量）
        var verticalAngle = -deltaY * this.rotateSpeed;
        var verticalQuaternion = new THREE.Quaternion();
        verticalQuaternion.setFromAxisAngle(right, verticalAngle);
        offset.applyQuaternion(verticalQuaternion);
        
        // 更新相机位置
        camera.position.copy(center).add(offset);
        
        // 让相机始终看向旋转中心
        camera.lookAt(center);
        
        // 更新相机矩阵
        camera.updateMatrixWorld();
        
        // 不更新controls.target，保持原有的目标点，避免视觉跳跃
    }
    
    // 旋转相机（围绕目标点）- 保留原方法用于兼容性
    rotate(deltaX, deltaY) {
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();
        
        if (!camera || !controls) return;
        
        // 计算球坐标
        const offset = new THREE.Vector3();
        offset.copy(camera.position).sub(controls.target);
        
        // 转换为球坐标
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(offset);
        
        // 水平旋转（绕Y轴）
        spherical.theta -= deltaX * this.rotateSpeed;
        
        // 垂直旋转（限制范围避免翻转）
        spherical.phi += deltaY * this.rotateSpeed;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        // 转换回笛卡尔坐标
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target).add(offset);
        
        // 更新相机朝向
        camera.lookAt(controls.target);
    }
    
    // 平移相机和目标点
    pan(deltaX, deltaY) {
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();
        const renderer = this.sceneManager.getRenderer();
        
        if (!camera || !controls || !renderer) return;
        
        // 计算平移向量
        const canvas = renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        // 获取相机的右向量和上向量
        const cameraRight = new THREE.Vector3();
        const cameraUp = new THREE.Vector3();
        
        camera.getWorldDirection(new THREE.Vector3()); // 确保矩阵是最新的
        cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
        cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);
        
        // 计算平移距离（基于相机到目标的距离）
        const distance = camera.position.distanceTo(controls.target);
        const panScale = distance * this.panSpeed;
        
        // 计算平移向量
        const panOffset = new THREE.Vector3();
        panOffset.addScaledVector(cameraRight, -deltaX * panScale);
        panOffset.addScaledVector(cameraUp, deltaY * panScale);
        
        // 同时移动相机和目标点
        camera.position.add(panOffset);
        controls.target.add(panOffset);
        
        // 平移后清除旋转中心，避免下次旋转时位置闪现
        this.rotationCenter = null;
    }
    
    // 缩放（SketchUp风格：以鼠标指向点为中心）
    zoom(event) {
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();
        const renderer = this.sceneManager.getRenderer();
        
        if (!camera || !controls || !renderer) return;
        
        // 获取鼠标位置
        const canvas = renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const mouse = {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1
        };
        
        // 创建射线检测缩放中心
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // 计算缩放因子
        const zoomFactor = event.deltaY > 0 ? 1 + this.zoomSpeed : 1 - this.zoomSpeed;
        
        // 尝试找到鼠标指向的点作为缩放中心
        let zoomCenter = null;
        const scene = this.sceneManager.getScene();
        
        if (scene) {
            const intersects = raycaster.intersectObjects(scene.children, true);
            if (intersects.length > 0) {
                // 使用射线相交点作为缩放中心
                zoomCenter = intersects[0].point;
            }
        }
        
        // 如果没有相交点，计算鼠标射线与当前视平面的交点
        if (!zoomCenter) {
            // 计算当前目标点到相机的距离
            const distanceToTarget = camera.position.distanceTo(controls.target);
            
            // 在射线方向上找到与目标点距离相同的点作为缩放中心
            zoomCenter = raycaster.ray.origin.clone().add(
                raycaster.ray.direction.clone().multiplyScalar(distanceToTarget)
            );
        }
        
        // 以缩放中心为基准进行缩放
        const cameraToCenter = new THREE.Vector3();
        cameraToCenter.subVectors(camera.position, zoomCenter);
        
        // 应用缩放
        cameraToCenter.multiplyScalar(zoomFactor);
        
        // 更新相机位置
        camera.position.copy(zoomCenter).add(cameraToCenter);
        
        // 更新目标点：使其朝向缩放中心移动（SketchUp风格）
        const targetToCenter = new THREE.Vector3();
        targetToCenter.subVectors(zoomCenter, controls.target);
        
        // 根据缩放程度调整目标点移动幅度
        const moveRatio = Math.abs(1 - zoomFactor) * 0.3; // 缩放越大，目标点移动越多
        controls.target.add(targetToCenter.multiplyScalar(moveRatio));
        
        // 缩放后清除旋转中心，避免下次旋转时位置闪现
        this.rotationCenter = null;
    }
    
    // 双击聚焦到点
    focusOnPoint(event) {
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();
        const renderer = this.sceneManager.getRenderer();
        
        if (!camera || !controls || !renderer) return;
        
        // 获取鼠标位置
        const canvas = renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const mouse = {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1
        };
        
        // 创建射线
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // 检测相交点
        const scene = this.sceneManager.getScene();
        if (scene) {
            const intersects = raycaster.intersectObjects(scene.children, true);
            if (intersects.length > 0) {
                // 将目标点设置为相交点
                controls.target.copy(intersects[0].point);
                console.log('聚焦到点:', intersects[0].point);
                
                // 聚焦后清除旋转中心，避免下次旋转时位置闪现
                this.rotationCenter = null;
            }
        }
    }
    
    // 获取鼠标光标样式
    getCursor(button) {
        if (button === 0) { // 左键
            return this.isShiftPressed ? 'move' : 'grab';
        } else if (button === 1 || button === 2) { // 中键或右键
            return 'move';
        }
        return 'default';
    }





    // 获取当前交互模式
    getCurrentMode() {
        return 'sketchup';
    }

    // 设置交互模式（保持兼容性）
    setInteractionMode(mode) {
        // SketchUp模式是唯一模式，保持兼容性
        console.log('当前使用SketchUp风格控制模式');
    }
    
    // 重置视角到适合模型的位置
    resetView() {
        if (this.cameraController && this.cameraController.fitToView) {
            this.cameraController.fitToView();
        }
    }
    
    // 设置旋转速度
    setRotateSpeed(speed) {
        this.rotateSpeed = speed;
    }
    
    // 设置平移速度
    setPanSpeed(speed) {
        this.panSpeed = speed;
    }
    
    // 设置缩放速度
    setZoomSpeed(speed) {
        this.zoomSpeed = speed;
    }

    // 清理资源
    dispose() {
        if (this.modeIndicator && this.modeIndicator.parentNode) {
            this.modeIndicator.parentNode.removeChild(this.modeIndicator);
            this.modeIndicator = null;
        }
    }
}