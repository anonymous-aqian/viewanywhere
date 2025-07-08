<template>
    <div class="model-viewer" id="canvas">
        <!-- 加载进度条 -->
        <div v-if="loading" class="loading-overlay">
            <div class="loading-container">
                <div class="loading-title">正在加载模型</div>

                <ProgressBar :value=loadingProgress></ProgressBar>
                <div class="loading-text">{{ loadingStatus }}</div>
                <div class="loading-percentage">{{ Math.round(loadingProgress) }}%</div>
            </div>
        </div>
        <div v-if="error" class="error">
            {{ error }}
        </div>
        <div v-if="!modelId" class="info">
            请在URL中添加modelid参数，例如：?modelid=your_model_name
        </div>

        <!-- 相机参数显示 -->
        <div v-if="showCameraInfo" class="camera-info">
            <div class="camera-title">相机参数</div>
            <div class="camera-params">
                <div class="param-row">
                    <span class="param-label">位置:</span>
                    <span class="param-value">{{ cameraPosition }}</span>
                </div>
                <div class="param-row">
                    <span class="param-label">目标:</span>
                    <span class="param-value">{{ cameraTarget }}</span>
                </div>
                <div class="param-row">
                    <span class="param-label">视野:</span>
                    <span class="param-value">{{ cameraFov }}°</span>
                </div>
                <div class="param-row">
                    <span class="param-label">距离:</span>
                    <span class="param-value">{{ cameraDistance }}</span>
                </div>
                <div class="param-row">
                    <span class="param-label">旋转:</span>
                    <span class="param-value">{{ cameraRotation }}</span>
                </div>
            </div>
        </div>

        <!-- 场景选择器 -->
        <div v-if="scenes.length > 0" class="scene-selector">
            <div class="scene-title">场景视角:</div>
            <select v-model="selectedScene" @change="switchScene" class="scene-select">
                <option value="default">默认视角</option>
                <option v-for="scene in scenes" :key="scene.index"
                    :value="scene.name === 'chenkaidi' ? 'chenkaidi' : scene.index">
                    {{ scene.name }}
                </option>
            </select>
        </div>

        <!-- 右上角控制区域 -->
        <div class="top-right-controls">
            <!-- 场景切换下拉框 -->
            <div v-if="availableScenes.length > 0" class="scene-combobox" @click.stop>
                <select v-model="currentSceneSelection" @change="onSceneChange" @click.stop @mousedown.stop
                    class="scene-dropdown">
                    <option value="default">默认视角</option>
                    <option v-for="scene in availableScenes" :key="scene.index" :value="scene.index">
                        {{ scene.name || `场景${scene.index}` }}
                    </option>
                </select>
            </div>

            <!-- 设置按钮 -->
            <div class="settings-button" @click="toggleSettings">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24px" height="24px">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path
                        d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                </svg>
            </div>
        </div>

        <!-- 设置面板遮罩层 -->
        <div v-if="showSettings" class="settings-overlay" @click="toggleSettings"></div>

        <!-- 设置面板 -->
        <div v-if="showSettings" class="settings-panel" @click.stop>
            <!-- 关闭按钮 -->
            <div class="close-button" @click="toggleSettings">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24px" height="24px">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
            </div>
            <!-- 界面显示控制面板 -->
            <div class="ui-panel">
                <div class="panel-title">界面显示</div>
                <div class="ui-controls">
                    <div class="control-group">
                        <label class="control-label">显示相机参数:</label>
                        <input type="checkbox" v-model="showCameraInfo" class="control-checkbox">
                    </div>
                    <!-- <div class="control-group">
                        <label class="control-label">显示坐标轴:</label>
                        <input type="checkbox" v-model="showAxisHelper" @change="toggleAxisHelper" class="control-checkbox">
                    </div> -->
                </div>
            </div>

            <!-- 光源控制面板 -->
            <div class="lighting-panel">
                <div class="panel-title">光源控制</div>
                <div class="lighting-controls">
                    <div class="control-group">
                        <label class="control-label">启用光源:</label>
                        <input type="checkbox" v-model="lightingEnabled" @change="toggleLighting"
                            class="control-checkbox">
                    </div>
                    <div class="control-group">
                        <label class="control-label">环境光强度:</label>
                        <input type="range" v-model="ambientIntensity" @input="updateAmbientLight" min="0" max="2"
                            step="0.1" class="control-slider">
                        <span class="control-value">{{ ambientIntensity }}</span>
                    </div>
                    <div class="control-group">
                        <label class="control-label">主光源强度:</label>
                        <input type="range" v-model="mainLightIntensity" @input="updateMainLight" min="0" max="3"
                            step="0.1" class="control-slider">
                        <span class="control-value">{{ mainLightIntensity }}</span>
                    </div>
                    <div class="control-group">
                        <label class="control-label">整体亮度:</label>
                        <input type="range" v-model="overallBrightness" @input="updateOverallBrightness" min="0.1"
                            max="3" step="0.1" class="control-slider">
                        <span class="control-value">{{ overallBrightness }}</span>
                    </div>
                    <div class="control-group">
                        <label class="control-label">主光源颜色:</label>
                        <input type="color" v-model="mainLightColor" @input="updateMainLightColor"
                            class="control-color">
                    </div>
                    <div class="control-group">
                        <button @click="resetLighting" class="reset-button">重置光源</button>
                    </div>
                </div>
            </div>

            <!-- 天空和地平线控制面板 -->
            <div class="sky-horizon-panel">
                <div class="panel-title">天空与地平线</div>
                <div class="sky-horizon-controls">
                    <div class="control-group">
                        <label class="control-label">显示天空:</label>
                        <input type="checkbox" v-model="skyEnabled" @change="toggleSky" class="control-checkbox">
                    </div>
                    <div class="control-group">
                        <label class="control-label">显示网格:</label>
                        <input type="checkbox" v-model="gridEnabled" @change="toggleGrid" class="control-checkbox">
                    </div>
                    <div class="control-group">
                        <label class="control-label">天空顶部颜色:</label>
                        <input type="color" v-model="skyTopColor" @input="updateSkyColors" class="control-color">
                    </div>
                    <div class="control-group">
                        <label class="control-label">地面颜色:</label>
                        <input type="color" v-model="skyBottomColor" @input="updateSkyColors" class="control-color">
                    </div>
                    <div class="control-group">
                        <label class="control-label">分界线位置:</label>
                        <input type="range" v-model="skyGradient" @input="updateSkyGradient" min="0.1" max="0.9"
                            step="0.1" class="control-slider">
                        <span class="control-value">{{ skyGradient }}</span>
                    </div>
                    <div class="control-group">
                        <label class="control-label">网格透明度:</label>
                        <input type="range" v-model="gridOpacity" @input="updateGridOpacity" min="0" max="1" step="0.1"
                            class="control-slider">
                        <span class="control-value">{{ gridOpacity }}</span>
                    </div>
                    <div class="control-group">
                        <button @click="resetSkyHorizon" class="reset-button">重置天空</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 3D坐标轴 -->
        <!-- <div ref="axisContainer" class="axis-container"></div> -->

        <div ref="container" class="viewer-container" :class="{ 'settings-open': showSettings }"></div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { ModelLoader } from '@/js/model-loader'
import { SceneManager } from '@/js/scene-manager'
import { InteractionController } from '@/js/interaction-controller'
import { CameraConfigLoader } from '@/js/camera-config-loader'
import { CameraController } from '@/js/camera-controller'


let clock = new THREE.Clock();
let sceneManager = null;
let modelLoader = null;
let cameraController = null;
let interactionController = null;
let cameraConfigLoader = null;
let isAnimating = false;

const container = ref(null)
const axisContainer = ref(null)
const loading = ref(true)
const error = ref('')
const modelId = ref('')
const scenes = ref([])
const selectedScene = ref('default')
// 新的场景切换相关变量
const availableScenes = ref([])
const currentSceneSelection = ref('default')
const cameraPosition = ref('0, 0, 0')
const cameraTarget = ref('0, 0, 0')
const cameraFov = ref(75)
const cameraDistance = ref(0)
const cameraRotation = ref('0°, 0°, 0°')
// 加载进度相关变量
const loadingProgress = ref(0)
const loadingStatus = ref('初始化中...')
const showSettings = ref(false)
const showCameraInfo = ref(true)
const showAxisHelper = ref(false)

// 光源控制相关变量
const lightingEnabled = ref(true)
const ambientIntensity = ref(0.4)
const mainLightIntensity = ref(1.2)
const overallBrightness = ref(1.0)
const mainLightColor = ref('#ffffff')

// 天空和地平线控制相关变量
const skyEnabled = ref(true)
const gridEnabled = ref(true)
const skyTopColor = ref('#87CEEB')  // 天空蓝
// const skyBottomColor = ref('#D2B48C')  // 浅棕色地面
const skyBottomColor = ref('#87CEEB')  // 浅棕色地面
const skyGradient = ref(0.1)  // 分界线位置，0.5表示中间
const gridOpacity = ref(0.3)

let renderer = null // 存储当前加载的相机数据

function toggleSettings() {
    showSettings.value = !showSettings.value
}
let animationId
// 坐标轴相关变量
let axisRenderer = null
let axisScene = null
let axisCamera = null
let axisHelper = null

// 从URL参数获取modelid
function getModelIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('modelid')
}

// 初始化坐标轴
function initAxisHelper() {
    if (!axisContainer.value) return

    console.log('初始化坐标轴...')

    // 创建坐标轴场景
    axisScene = new THREE.Scene()

    // 创建坐标轴相机
    axisCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10)
    axisCamera.position.set(0, 0, 3)
    axisCamera.lookAt(0, 0, 0)

    // 创建坐标轴渲染器
    axisRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    axisRenderer.setSize(100, 100)
    axisRenderer.setClearColor(0x000000, 0)

    // 创建自定义坐标轴（全红色）
    createCustomAxes()

    // 备用：如果需要默认颜色的坐标轴，可以使用下面的代码
    // axisHelper = new THREE.AxesHelper(1.5)
    // axisScene.add(axisHelper)

    // 创建坐标轴标签
    createAxisLabels()

    // 添加环境光以确保坐标轴可见
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    axisScene.add(ambientLight)

    // 将渲染器添加到容器
    axisContainer.value.appendChild(axisRenderer.domElement)

    console.log('坐标轴初始化完成')

    // 立即渲染一次
    if (axisRenderer && axisScene && axisCamera) {
        axisRenderer.render(axisScene, axisCamera)
    }
}

// 创建自定义坐标轴（标准RGB颜色）
function createCustomAxes() {
    const axisLength = 1.5

    // 创建X轴（红色）
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(axisLength, 0, 0)
    ])
    const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 })
    const xLine = new THREE.Line(xGeometry, xMaterial)
    axisScene.add(xLine)

    // 创建Y轴（绿色）
    const yGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, axisLength, 0)
    ])
    const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 })
    const yLine = new THREE.Line(yGeometry, yMaterial)
    axisScene.add(yLine)

    // 创建Z轴（蓝色）
    const zGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, axisLength)
    ])
    const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 })
    const zLine = new THREE.Line(zGeometry, zMaterial)
    axisScene.add(zLine)

    // 添加箭头头部来更清楚地表示方向
    createArrowHeads(axisLength)
}

// 创建箭头头部
function createArrowHeads(axisLength) {
    const arrowSize = 0.1
    const arrowLength = 0.15

    // X轴箭头（红色）
    const xArrowGeometry = new THREE.ConeGeometry(arrowSize, arrowLength, 8)
    const xArrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const xArrow = new THREE.Mesh(xArrowGeometry, xArrowMaterial)
    xArrow.position.set(axisLength, 0, 0)
    xArrow.rotation.z = -Math.PI / 2
    axisScene.add(xArrow)

    // Y轴箭头（绿色）
    const yArrowGeometry = new THREE.ConeGeometry(arrowSize, arrowLength, 8)
    const yArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    const yArrow = new THREE.Mesh(yArrowGeometry, yArrowMaterial)
    yArrow.position.set(0, axisLength, 0)
    axisScene.add(yArrow)

    // Z轴箭头（蓝色）
    const zArrowGeometry = new THREE.ConeGeometry(arrowSize, arrowLength, 8)
    const zArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff })
    const zArrow = new THREE.Mesh(zArrowGeometry, zArrowMaterial)
    zArrow.position.set(0, 0, axisLength)
    zArrow.rotation.x = Math.PI / 2
    axisScene.add(zArrow)
}

// 创建坐标轴标签
function createAxisLabels() {
    // 创建文字纹理的函数
    function createTextTexture(text, color) {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = 64
        canvas.height = 64

        // 清除画布
        context.clearRect(0, 0, 64, 64)

        context.fillStyle = color
        context.font = 'bold 32px Arial'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(text, 32, 32)

        const texture = new THREE.CanvasTexture(canvas)
        texture.needsUpdate = true
        return texture
    }

    const axisLength = 1.5
    const labelOffset = 0.3

    // 创建X轴标签（红色）
    const xTexture = createTextTexture('X', '#ff0000')
    const xSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: xTexture, transparent: true }))
    xSprite.position.set(axisLength + labelOffset, 0, 0)
    xSprite.scale.set(0.4, 0.4, 0.4)
    axisScene.add(xSprite)

    // 创建Y轴标签（绿色）
    const yTexture = createTextTexture('Y', '#00ff00')
    const ySprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: yTexture, transparent: true }))
    ySprite.position.set(0, axisLength + labelOffset, 0)
    ySprite.scale.set(0.4, 0.4, 0.4)
    axisScene.add(ySprite)

    // 创建Z轴标签（蓝色）
    const zTexture = createTextTexture('Z', '#0000ff')
    const zSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTexture, transparent: true }))
    zSprite.position.set(0, 0, axisLength + labelOffset)
    zSprite.scale.set(0.4, 0.4, 0.4)
    axisScene.add(zSprite)
}

// 切换坐标轴显示
function toggleAxisHelper() {
    // 控制右下角小坐标轴
    if (axisContainer.value) {
        if (showAxisHelper.value) {
            axisContainer.value.style.display = 'block'
        } else {
            axisContainer.value.style.display = 'none'
        }
    }
}

// 更新坐标轴方向
function updateAxisHelper() {
    if (!axisCamera || !sceneManager || !axisRenderer || !axisScene || !showAxisHelper.value) return

    const mainCamera = sceneManager.getCamera()
    if (!mainCamera) return

    // 获取主相机的旋转矩阵
    const rotationMatrix = new THREE.Matrix4()
    rotationMatrix.extractRotation(mainCamera.matrixWorld)

    // 应用旋转到坐标轴相机
    axisCamera.position.set(0, 0, 3)
    axisCamera.position.applyMatrix4(rotationMatrix)
    axisCamera.lookAt(0, 0, 0)

    // 渲染坐标轴
    axisRenderer.render(axisScene, axisCamera)
}

// 自定义X轴直线对象
let customXAxisLine = null;
let customYAxisLine = null;
let customZAxisLine = null;

// 每帧渲染时调用的自定义方法
function renderCustomContent() {
    // 在这里可以添加其他需要每帧更新的自定义内容
    // 例如：
    // - 更新动态效果
    // - 处理自定义动画
    // - 添加UI元素到场景中

    // 添加红色的无限长X轴直线
    if (!customXAxisLine && sceneManager) {
        const scene = sceneManager.getScene();
        if (scene) {
            // 创建一条很长的X轴直线（模拟无限长）
            const lineLength = Number.MAX_SAFE_INTEGER; // 足够长的距离
            const points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(lineLength, 0, 0)
            ];

            // 创建几何体
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            // 创建红色材质
            const material = new THREE.LineBasicMaterial({
                color: 0xff0000, // 红色
                linewidth: 2 // 线宽
            });

            // 创建线对象
            customXAxisLine = new THREE.Line(geometry, material);

            // 添加到场景中
            scene.add(customXAxisLine);

            console.log('已添加红色X轴直线到场景中');
        }
    }

    // 添加绿色的无限长Y轴直线
    if (!customYAxisLine && sceneManager) {
        const scene = sceneManager.getScene();
        if (scene) {
            // 创建一条很长的X轴直线（模拟无限长）
            const lineLength = Number.MAX_SAFE_INTEGER; // 足够长的距离
            const points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, lineLength, 0)
            ];

            // 创建几何体
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            // 创建红色材质
            const material = new THREE.LineBasicMaterial({
                color: 0x00ff00, // 绿色
                linewidth: 2 // 线宽
            });

            // 创建线对象
            customYAxisLine = new THREE.Line(geometry, material);

            // 添加到场景中
            scene.add(customYAxisLine);

            console.log('已添加红色Y轴直线到场景中');
        }
    }

    // 添加蓝色的无限Z轴直线
    if (!customZAxisLine && sceneManager) {
        const scene = sceneManager.getScene();
        if (scene) {
            // 创建一条很长的X轴直线（模拟无限长）
            const lineLength = Number.MAX_SAFE_INTEGER; // 足够长的距离
            const points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, lineLength)
            ];

            // 创建几何体
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            // 创建红色材质
            const material = new THREE.LineBasicMaterial({
                color: 0x0000ff, // 蓝色
                linewidth: 2 // 线宽
            });

            // 创建线对象
            customZAxisLine = new THREE.Line(geometry, material);

            // 添加到场景中
            scene.add(customZAxisLine);

            console.log('已添加红色Z轴直线到场景中');
        }
    }
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // 更新相机控制器
    if (cameraController) {
        cameraController.update();
    }

    // 更新相机信息显示
    updateCameraInfo();

    // 如果有模型且动画开启，进行自动旋转
    const currentModel = sceneManager ? sceneManager.getModel() : null;
    if (currentModel && isAnimating) {
        currentModel.rotation.y += rotationSpeed;
    }

    // 更新动画混合器
    const currentMixer = modelLoader ? modelLoader.getMixer() : null;
    if (currentMixer) {
        currentMixer.update(delta);
    }

    // 调用自定义渲染方法
    renderCustomContent();

    // 渲染场景
    if (sceneManager) {
        sceneManager.render();
    }

    // 更新坐标轴
    updateAxisHelper();
}

function updateCameraInfo() {
    const camera = sceneManager ? sceneManager.getCamera() : null;
    const controls = sceneManager ? sceneManager.getControls() : null;
    if (!camera || !controls) return

    // 更新相机位置
    cameraPosition.value = `${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`

    // 更新相机目标
    cameraTarget.value = `${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)}`

    // 更新视野角度
    cameraFov.value = camera.fov.toFixed(1)

    // 计算相机到目标的距离（乘以25.4进行单位转换）
    const distance = camera.position.distanceTo(controls.target)
    cameraDistance.value = distance.toFixed(2)

    // 更新相机旋转角度（转换为度数）
    const rotationX = (camera.rotation.x * 180 / Math.PI).toFixed(1)
    const rotationY = (camera.rotation.y * 180 / Math.PI).toFixed(1)
    const rotationZ = (camera.rotation.z * 180 / Math.PI).toFixed(1)
    cameraRotation.value = `${rotationX}°, ${rotationY}°, ${rotationZ}°`
}

function updateModelLoadProgress(progress) {
    loadingProgress.value = progress
    if (progress >= 100) {
        loading.value = false;
    }
}

// 光源控制方法
function toggleLighting() {
    if (sceneManager) {
        sceneManager.toggleLights(lightingEnabled.value);
    }
}

function updateAmbientLight() {
    if (sceneManager) {
        sceneManager.setAmbientLightIntensity(parseFloat(ambientIntensity.value));
    }
}

function updateMainLight() {
    if (sceneManager) {
        const lights = sceneManager.getLights();
        // 找到主光源（第二个光源，索引为1）
        if (lights && lights.length > 1 && lights[1].isDirectionalLight) {
            lights[1].intensity = parseFloat(mainLightIntensity.value);
        }
    }
}

function updateOverallBrightness() {
    if (sceneManager) {
        // 重置光源然后应用新的亮度倍数
        sceneManager.resetLights();
        sceneManager.adjustLightIntensity(parseFloat(overallBrightness.value));
        // 重新应用当前的环境光和主光源设置
        updateAmbientLight();
        updateMainLight();
        updateMainLightColor();
    }
}

function updateMainLightColor() {
    if (sceneManager) {
        const lights = sceneManager.getLights();
        // 找到主光源（第二个光源，索引为1）
        if (lights && lights.length > 1 && lights[1].isDirectionalLight) {
            lights[1].color.setHex(parseInt(mainLightColor.value.replace('#', '0x')));
        }
    }
}

function resetLighting() {
    if (sceneManager) {
        // 重置所有光源控制变量到默认值
        lightingEnabled.value = true;
        ambientIntensity.value = 0.4;
        mainLightIntensity.value = 1.2;
        overallBrightness.value = 1.0;
        mainLightColor.value = '#ffffff';

        // 重置场景光源
        sceneManager.resetLights();
    }
}

// 天空和地平线控制方法
function toggleSky() {
    if (sceneManager) {
        sceneManager.toggleSky(skyEnabled.value);
    }
}

function toggleGrid() {
    if (sceneManager) {
        sceneManager.toggleHorizonGrid(gridEnabled.value);
    }
}

function updateSkyColors() {
    if (sceneManager) {
        const topColor = parseInt(skyTopColor.value.replace('#', '0x'));
        const bottomColor = parseInt(skyBottomColor.value.replace('#', '0x'));
        sceneManager.adjustSkyColors(topColor, bottomColor);
    }
}

function updateSkyGradient() {
    if (sceneManager) {
        sceneManager.adjustSkyGradient(33, parseFloat(skyGradient.value));
    }
}

function updateGridOpacity() {
    if (sceneManager) {
        const opacity = parseFloat(gridOpacity.value);
        sceneManager.adjustGridOpacity(opacity, opacity * 0.3);
    }
}

function resetSkyHorizon() {
    if (sceneManager) {
        // 重置所有天空和地平线控制变量到默认值
        skyEnabled.value = true;
        gridEnabled.value = true;
        skyTopColor.value = '#87CEEB';  // 天空蓝
        // skyBottomColor.value = '#D2B48C';  // 浅棕色地面
        skyBottomColor.value = '#87CEEB';  // 浅棕色地面
        skyGradient.value = 0.5;  // 分界线位置重置为中间
        gridOpacity.value = 0.3;

        // 应用重置的设置
        toggleSky();
        toggleGrid();
        updateSkyColors();
        updateSkyGradient();
        updateGridOpacity();
    }
}

// 切换场景方法
function switchScene() {
    if (cameraConfigLoader && selectedScene.value !== 'default') {
        cameraConfigLoader.switchToScene(selectedScene.value);
    } else if (cameraController) {
        // 切换到默认视角
        cameraController.resetToDefault();
    }
}

// 处理右上角场景下拉框的切换
function onSceneChange() {
    if (currentSceneSelection.value === 'default') {
        // 切换到默认视角
        if (cameraController) {
            cameraController.resetToDefault();
        }
    } else {
        // 切换到指定场景
        if (cameraConfigLoader) {
            // currentSceneSelection.value 已经是场景索引
            const sceneIndex = parseInt(currentSceneSelection.value);
            cameraConfigLoader.switchToScene(sceneIndex);
            console.log('切换到场景:', sceneIndex);
        }
    }
}

// 更新可用场景列表
function updateAvailableScenes() {
    if (cameraConfigLoader && cameraConfigLoader.getAllScenes) {
        const allScenes = cameraConfigLoader.getAllScenes();
        availableScenes.value = allScenes.map((scene, index) => ({
            index: index,
            name: scene.name || `场景 ${index + 1}`,
            description: scene.description || ''
        }));
        console.log('更新可用场景列表:', availableScenes.value);
    }
}

onMounted(() => {
    console.log('组件挂载，开始初始化')
    modelId.value = getModelIdFromUrl()
    console.log('获取到的modelId:', modelId.value)
    // 等待DOM渲染完成
    setTimeout(async () => {
        loading.value = true;
        if (modelId.value) {
            // 初始化各个管理器
            sceneManager = new SceneManager();
            sceneManager.init();

            // 将渲染器添加到容器中
            const renderer = sceneManager.getRenderer();
            if (renderer && container.value) {
                container.value.appendChild(renderer.domElement);
                console.log('渲染器已添加到容器');
            } else {
                console.error('渲染器或容器元素不存在');
            }

            // 创建相机控制器
            cameraController = new CameraController(sceneManager);

            // 创建模型加载器
            modelLoader = new ModelLoader(sceneManager, cameraController);

            // 创建交互控制器
            interactionController = new InteractionController(sceneManager, cameraController);

            // 创建相机配置加载器
            cameraConfigLoader = new CameraConfigLoader(cameraController);

            // 设置为全局变量以便场景切换功能使用
            window.cameraConfigLoader = cameraConfigLoader;

            // 初始化坐标轴
            initAxisHelper();

            // 开始渲染循环
            animate();

            // 监听窗口大小变化
            window.addEventListener('resize', () => {
                if (sceneManager) {
                    sceneManager.onWindowResize();
                }
            }, false);

            // 添加相机测试控制
            cameraController.addCameraTestControls();

            const modelUrl = `http://192.168.3.228:9000/viewanywhere/${modelId.value}/${modelId.value}.obj`;
            const cameraConfig = modelUrl.replace('.obj', '_camera_info.json');

            // 重置进度
            loadingProgress.value = 0;
            loadingStatus.value = '开始加载模型...';

            modelLoader.loadOBJModel(modelUrl, updateModelLoadProgress);

            // 加载相机配置
            if (cameraConfig && cameraConfig !== '') {
                await cameraConfigLoader.loadCameraConfig(cameraConfig);
                // 更新可用场景列表
                updateAvailableScenes();
            }
        } else {
            loading.value = false;
        }
    }, 100);
})

onUnmounted(() => {
    console.log('组件卸载，清理资源')

    if (animationId) {
        cancelAnimationFrame(animationId)
    }

    if (renderer) {
        renderer.dispose()
    }

    // 清理自定义X轴直线
    if (customXAxisLine && sceneManager) {
        const scene = sceneManager.getScene()
        if (scene) {
            scene.remove(customXAxisLine)
            customXAxisLine.geometry.dispose()
            customXAxisLine.material.dispose()
            customXAxisLine = null
            console.log('已清理自定义X轴直线')
        }
    }

    // 清理自定义Y轴直线
    if (customYAxisLine && sceneManager) {
        const scene = sceneManager.getScene()
        if (scene) {
            scene.remove(customYAxisLine)
            customYAxisLine.geometry.dispose()
            customYAxisLine.material.dispose()
            customYAxisLine = null
            console.log('已清理自定义Y轴直线')
        }
    }

    // 清理自定义Z轴直线
    if (customZAxisLine && sceneManager) {
        const scene = sceneManager.getScene()
        if (scene) {
            scene.remove(customZAxisLine)
            customZAxisLine.geometry.dispose()
            customZAxisLine.material.dispose()
            customZAxisLine = null
            console.log('已清理自定义Y轴直线')
        }
    }

    // 清理坐标轴渲染器
    if (axisRenderer) {
        axisRenderer.dispose()
        if (axisRenderer.domElement && axisRenderer.domElement.parentNode) {
            axisRenderer.domElement.parentNode.removeChild(axisRenderer.domElement)
        }
    }

    // 清理相机配置加载器
    if (cameraConfigLoader) {
        cameraConfigLoader.destroy()
    }

    // 清理全局变量
    if (window.cameraConfigLoader) {
        delete window.cameraConfigLoader
    }
})
</script>

<style scoped>
.model-viewer {
    width: 100%;
    height: 100vh;
    position: relative;
}

.viewer-container {
    width: 100%;
    height: 100%;
}

.axis-container {
    position: absolute;
    bottom: 20px;
    left: 20px;
    width: 100px;
    height: 100px;
    z-index: 1000;
    pointer-events: none;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(5px);
}

/* 加载进度条样式 */
.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.loading-container {
    background: rgba(255, 255, 255, 0.95);
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    text-align: center;
    min-width: 300px;
    max-width: 400px;
    backdrop-filter: blur(10px);
    box-sizing: border-box;
}

.loading-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-bottom: 20px;
}

@keyframes shimmer {
    0% {
        transform: translateX(-100%);
    }

    100% {
        transform: translateX(100%);
    }
}

.loading-text {
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
}

.loading-percentage {
    font-size: 16px;
    font-weight: 600;
    color: #4CAF50;
}

.camera-info {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.8);
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
    min-width: 200px;
}

.camera-title {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 8px;
    color: #00ff88;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 4px;
}

.camera-params {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.param-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.param-label {
    color: #cccccc;
    font-weight: 500;
    min-width: 50px;
}

.param-value {
    color: #ffffff;
    font-weight: bold;
    text-align: right;
    font-family: 'Courier New', monospace;
}

.scene-selector {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.7);
    padding: 10px 15px;
    border-radius: 8px;
    color: white;
    font-family: Arial, sans-serif;
}

.scene-title {
    font-size: 14px;
    margin-bottom: 8px;
    font-weight: bold;
}

.scene-select {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 14px;
    color: #333;
}

.scene-combobox {
    position: absolute;
    top: 20px;
    left: 20px;
    /* 移到左上角 */
    z-index: 9999;
    /* 确保在所有元素之上 */
    background: rgba(255, 255, 255, 0.95);
    padding: 0;
    border-radius: 8px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: auto;
    /* 确保可以接收鼠标事件 */
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
}

.scene-combobox:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.scene-dropdown {
    background: transparent;
    border: none;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: #333;
    min-width: 130px;
    cursor: pointer;
    position: relative;
    z-index: 10000;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    font-weight: 500;
    transition: all 0.2s ease;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 16px;
    padding-right: 32px;
}

.scene-dropdown:focus {
    outline: none;
    background-color: rgba(0, 123, 255, 0.05);
}

.scene-dropdown:hover {
    background-color: rgba(0, 0, 0, 0.02);
}

.scene-dropdown option {
    background: white;
    color: #333;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 400;
}

.settings-button {
    position: absolute;
    top: 20px;
    right: 20px;
    cursor: pointer;
    z-index: 20;
}

.settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%);
    z-index: 18;
    backdrop-filter: blur(1px);
    pointer-events: auto;
}

.settings-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(40, 40, 40, 0.9);
    padding: 20px;
    border-radius: 10px;
    color: #ffffff;
    width: 480px;
    min-width: 320px;
    z-index: 19;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    max-height: 80vh;
    overflow-y: auto;
    pointer-events: auto;
}

.close-button {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    z-index: 20;
    transition: transform 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.15);
    border-radius: 50%;
    padding: 2px;
}

.close-button:hover {
    transform: scale(1.1);
}

.lighting-panel,
.sky-horizon-panel,
.ui-panel {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
    color: #ffffff;
    max-width: none;
    position: static;
}

.sky-horizon-controls,
.ui-controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.panel-title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 12px;
    color: #00ff88;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 6px;
}

.lighting-controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.control-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.control-label {
    font-size: 13px;
    color: #cccccc;
    min-width: 80px;
    flex-shrink: 0;
}

.control-checkbox {
    width: 18px;
    height: 18px;
    accent-color: #00ff88;
}

.control-slider {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
}

.control-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #00ff88;
    border-radius: 50%;
    cursor: pointer;
}

.control-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #00ff88;
    border-radius: 50%;
    cursor: pointer;
    border: none;
}

.control-value {
    font-size: 12px;
    color: #ffffff;
    font-weight: bold;
    min-width: 30px;
    text-align: right;
}

.control-color {
    width: 40px;
    height: 25px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
}

.reset-button {
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
    transition: all 0.3s ease;
    width: 100%;
}

.reset-button:hover {
    background: linear-gradient(135deg, #ee5a24, #ff6b6b);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.reset-button:active {
    transform: translateY(0);
}

.scene-select:hover {
    background: rgba(255, 255, 255, 1);
}

.scene-select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
}

.coordinate-debug {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.8);
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-family: Arial, sans-serif;
    min-width: 200px;
}

.debug-title {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 8px;
    color: #ff9500;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 4px;
}

.debug-controls {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.debug-option {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    cursor: pointer;
    padding: 2px 0;
}

.debug-option input[type="radio"] {
    margin: 0;
    cursor: pointer;
}

.debug-option:hover {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 2px 4px;
}

.debug-separator {
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
    margin: 8px 0;
}

.debug-unit-control {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
}

.unit-label {
    font-size: 12px;
    color: #ff9500;
    font-weight: bold;
}

.unit-slider {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
}

.unit-slider::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: #ff9500;
    border-radius: 50%;
    cursor: pointer;
}

.unit-value {
    font-size: 11px;
    color: #ccc;
    text-align: center;
}

.debug-unit-presets {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.unit-preset {
    background: rgba(255, 149, 0, 0.2);
    border: 1px solid rgba(255, 149, 0, 0.5);
    color: #ff9500;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.2s;
}

.unit-preset:hover {
    background: rgba(255, 149, 0, 0.4);
    border-color: #ff9500;
}

.loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 18px;
    color: #666;
    z-index: 10;
    background: rgba(255, 255, 255, 0.9);
    padding: 20px;
    border-radius: 8px;
}

.error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 16px;
    color: #ff0000;
    z-index: 10;
    text-align: center;
    padding: 20px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    max-width: 80%;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.info {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 16px;
    color: #333;
    z-index: 10;
    text-align: center;
    padding: 20px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.debug-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2000;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 80%;
    max-height: 80%;
    overflow: auto;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
}

.debug-overlay h3 {
    margin: 0 0 10px 0;
    color: #ff9500;
    font-size: 16px;
}

.debug-overlay pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.viewer-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
}

.viewer-container.settings-open {
    /* 确保在设置面板打开时模型容器不会变大或移动 */
    transform: none !important;
    transition: none !important;
}
</style>