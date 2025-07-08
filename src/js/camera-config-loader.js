// 相机配置加载器 - 负责从URL加载相机配置
export class CameraConfigLoader {
    constructor(cameraController) {
        this.cameraController = cameraController;
        this.scenes = []; // 存储场景数据
        this.currentSceneIndex = -1; // 当前场景索引
    }

    // 从URL加载相机配置
    async loadCameraConfig(url) {
        try {
            console.log('开始加载相机配置:', url);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态: ${response.status}`);
            }

            const cameraData = await response.json();
            console.log('相机配置加载成功:', cameraData);

            // 保存到全局变量供测试使用
            window.lastCameraData = cameraData;

            // 处理场景数据
            this.processSceneData(cameraData);

            // 应用相机配置
            this.applyCameraConfig(cameraData);

            // 添加测试控制器
            this.cameraController.addCameraTestControls();

            // 提示用户可以测试不同的坐标转换方案
            console.log('\n=== 相机配置已加载 ===');
            console.log('现在你可以:');
            console.log('- 按 H 键查看所有可用的测试命令');
            console.log('- 按 0 键启动交互式坐标转换测试');
            console.log('- 按 R 键重置相机到默认位置');
            console.log('- 按 M 键切换交互模式');
            if (this.scenes.length > 0) {
                console.log(`- 按 S 键切换场景 (共${this.scenes.length}个场景)`);
                console.log('- 按 1-9 键快速切换到对应场景');
            }

            return cameraData;

        } catch (error) {
            console.error('加载相机配置失败:', error);
            throw error;
        }
    }

    // 处理场景数据
    processSceneData(cameraData) {
        if (cameraData.scenes && Array.isArray(cameraData.scenes)) {
            this.scenes = cameraData.scenes;
            console.log(`加载了 ${this.scenes.length} 个场景:`);
            this.scenes.forEach((scene, index) => {
                console.log(`  ${index + 1}. ${scene.name || `场景${scene.index}`}`);
            });
            
            // 如果有场景数据，添加场景切换控制
            this.addSceneControls();
        } else {
            this.scenes = [];
            console.log('未找到场景数据');
        }
    }

    // 应用相机配置
    applyCameraConfig(cameraData) {
        try {
            // 验证相机配置数据
            this.validateCameraConfig(cameraData);

            // 使用方案4作为默认方案
            this.cameraController.setCameraFromJSON_Method4(cameraData);

            console.log('相机配置已应用');
        } catch (error) {
            console.error('应用相机配置失败:', error);
            throw error;
        }
    }

    // 验证相机配置数据
    validateCameraConfig(cameraDataOrigin) {
        let cameraData = cameraDataOrigin;
        if (cameraDataOrigin.current_camera) {
            cameraData = cameraDataOrigin.current_camera;
        }
        const required = ['position', 'target'];
        const missing = required.filter(field => !cameraData[field]);

        if (missing.length > 0) {
            throw new Error(`相机配置缺少必需字段: ${missing.join(', ')}`);
        }

        // 验证数组长度
        if (!Array.isArray(cameraData.position) || cameraData.position.length !== 3) {
            throw new Error('position字段必须是包含3个数字的数组');
        }

        if (!Array.isArray(cameraData.target) || cameraData.target.length !== 3) {
            throw new Error('target字段必须是包含3个数字的数组');
        }

        if (cameraData.up_vector && (!Array.isArray(cameraData.up_vector) || cameraData.up_vector.length !== 3)) {
            throw new Error('up_vector字段必须是包含3个数字的数组');
        }

        // 验证数值类型
        const validateNumbers = (arr, name) => {
            if (!arr.every(val => typeof val === 'number' && !isNaN(val))) {
                throw new Error(`${name}字段必须包含有效的数字`);
            }
        };

        validateNumbers(cameraData.position, 'position');
        validateNumbers(cameraData.target, 'target');
        if (cameraData.up_vector) {
            validateNumbers(cameraData.up_vector, 'up_vector');
        }

        if (cameraData.field_of_view && (typeof cameraData.field_of_view !== 'number' || isNaN(cameraData.field_of_view))) {
            throw new Error('field_of_view字段必须是有效的数字');
        }

        if (cameraData.focal_length && (typeof cameraData.focal_length !== 'number' || isNaN(cameraData.focal_length))) {
            throw new Error('focal_length字段必须是有效的数字');
        }

        return true;
    }

    // 添加场景控制
    addSceneControls() {
        if (this.scenes.length === 0) return;

        // 移除之前的事件监听器（如果存在）
        if (this.sceneKeyHandler) {
            document.removeEventListener('keydown', this.sceneKeyHandler);
        }

        // 创建新的事件处理器
        this.sceneKeyHandler = (event) => {
            // 如果焦点在表单元素上，不处理快捷键
            if (event.target.tagName === 'SELECT' || 
                event.target.tagName === 'INPUT' || 
                event.target.tagName === 'TEXTAREA' ||
                event.target.tagName === 'OPTION') {
                return;
            }
            
            // 按 S 键切换到下一个场景
            if (event.key.toLowerCase() === 's') {
                this.switchToNextScene();
                event.preventDefault();
            }
            // 按数字键1-9快速切换场景
            else if (event.key >= '1' && event.key <= '9') {
                const sceneIndex = parseInt(event.key) - 1;
                if (sceneIndex < this.scenes.length) {
                    this.switchToScene(sceneIndex);
                    event.preventDefault();
                }
            }
        };

        // 添加事件监听器
        document.addEventListener('keydown', this.sceneKeyHandler);
    }

    // 切换到下一个场景
    switchToNextScene() {
        if (this.scenes.length === 0) {
            console.log('没有可用的场景');
            return;
        }

        this.currentSceneIndex = (this.currentSceneIndex + 1) % this.scenes.length;
        this.switchToScene(this.currentSceneIndex);
    }

    // 切换到指定场景
    switchToScene(index) {
        if (index < 0 || index >= this.scenes.length) {
            console.log('场景索引超出范围');
            return;
        }

        const scene = this.scenes[index];
        this.currentSceneIndex = index;

        console.log(`切换到场景 ${index + 1}: ${scene.name || `场景${scene.index}`}`);

        if (scene.camera_info) {
            try {
                // 创建相机配置对象
                const cameraConfig = {
                    current_camera: scene.camera_info
                };

                // 应用场景的相机配置
                this.applyCameraConfig(cameraConfig);
                
                console.log('场景相机配置已应用');
            } catch (error) {
                console.error('应用场景相机配置失败:', error);
            }
        } else {
            console.log('该场景没有相机配置信息');
        }
    }

    // 获取当前场景信息
    getCurrentScene() {
        if (this.currentSceneIndex >= 0 && this.currentSceneIndex < this.scenes.length) {
            return this.scenes[this.currentSceneIndex];
        }
        return null;
    }

    // 获取所有场景信息
    getAllScenes() {
        return this.scenes;
    }

    // 根据名称查找场景
    findSceneByName(name) {
        return this.scenes.find(scene => scene.name === name);
    }

    // 根据索引查找场景
    findSceneByIndex(index) {
        return this.scenes.find(scene => scene.index === index);
    }

    // 从JSON字符串加载相机配置
    loadCameraConfigFromJSON(jsonString) {
        try {
            const cameraData = JSON.parse(jsonString);
            this.validateCameraConfig(cameraData);

            // 保存到全局变量
            window.lastCameraData = cameraData;

            // 处理场景数据
            this.processSceneData(cameraData);

            // 应用配置
            this.applyCameraConfig(cameraData);

            console.log('从JSON字符串加载相机配置成功');
            return cameraData;

        } catch (error) {
            console.error('从JSON字符串加载相机配置失败:', error);
            throw error;
        }
    }

    // 导出当前相机配置
    exportCurrentCameraConfig(includeScenes = false) {
        const camera = this.cameraController.sceneManager.getCamera();
        const controls = this.cameraController.sceneManager.getControls();

        if (!camera || !controls) {
            throw new Error('相机或控制器未初始化');
        }

        const config = {
            current_camera: {
                position: [camera.position.x, camera.position.y, camera.position.z],
                target: [controls.target.x, controls.target.y, controls.target.z],
                up_vector: [camera.up.x, camera.up.y, camera.up.z],
                field_of_view: camera.fov
            }
        };

        if (camera.focalLength) {
            config.current_camera.focal_length = camera.focalLength;
        }

        // 如果需要包含场景数据
        if (includeScenes && this.scenes.length > 0) {
            config.scenes = this.scenes;
        }

        console.log('当前相机配置:', config);
        return config;
    }

    // 保存相机配置到本地存储
    saveCameraConfigToLocalStorage(key = 'modelViewerCameraConfig') {
        try {
            const config = this.exportCurrentCameraConfig();
            localStorage.setItem(key, JSON.stringify(config));
            console.log('相机配置已保存到本地存储:', key);
            return config;
        } catch (error) {
            console.error('保存相机配置到本地存储失败:', error);
            throw error;
        }
    }

    // 从本地存储加载相机配置
    loadCameraConfigFromLocalStorage(key = 'modelViewerCameraConfig') {
        try {
            const configString = localStorage.getItem(key);
            if (!configString) {
                throw new Error('本地存储中没有找到相机配置');
            }

            const config = this.loadCameraConfigFromJSON(configString);
            console.log('从本地存储加载相机配置成功:', key);
            return config;

        } catch (error) {
            console.error('从本地存储加载相机配置失败:', error);
            throw error;
        }
    }

    // 清除本地存储的相机配置
    clearCameraConfigFromLocalStorage(key = 'modelViewerCameraConfig') {
        try {
            localStorage.removeItem(key);
            console.log('已清除本地存储的相机配置:', key);
        } catch (error) {
            console.error('清除本地存储的相机配置失败:', error);
            throw error;
        }
    }

    // 清理资源
    destroy() {
        // 移除场景切换事件监听器
        if (this.sceneKeyHandler) {
            document.removeEventListener('keydown', this.sceneKeyHandler);
            this.sceneKeyHandler = null;
        }
        
        // 清空场景数据
        this.scenes = [];
        this.currentSceneIndex = -1;
        
        console.log('相机配置加载器已清理');
    }
}