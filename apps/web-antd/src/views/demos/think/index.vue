<template>
  <div class="think-container">
    <div class="container">
      <header>
        <h1>思考卡片</h1>
        <p class="subtitle">记录每日思考，捕捉灵感瞬间。每个想法都是一个独立的卡片，支持点赞功能。</p>
      </header>
      
      <button class="add-card-btn" @click="openAddModal">
        <i class="fas fa-plus"></i> 添加新思考
      </button>
      
      <div class="cards-container">
        <div v-if="thoughts.length === 0" class="empty-state">
          <i class="fas fa-lightbulb"></i>
          <h3>还没有任何思考记录</h3>
          <p>点击上方按钮添加你的第一个思考卡片</p>
        </div>
        
        <div 
          v-for="thought in thoughts" 
          :key="thought.id" 
          class="card"
          @dblclick="openEditModal(thought.id)"
        >
          <div class="card-content">{{ thought.content }}</div>
          
          <div class="card-footer">
            <span class="card-date">{{ formatDate(thought.date) }}</span>
            <div class="event-count">
              <i class="fas fa-list"></i>
              <span class="count">{{ thought.events.length }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 添加/编辑卡片模态框 -->
      <div v-if="showModal" class="modal" @click="closeCardModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2 class="modal-title">{{ modalTitle }}</h2>
            <button class="close-btn" @click="closeCardModal">&times;</button>
          </div>
          <form @submit.prevent="saveCard">
            <div class="form-group">
              <label for="thoughtContent">思考内容 *</label>
              <textarea 
                id="thoughtContent" 
                v-model="form.content"
                placeholder="写下你的思考..." 
                required
              ></textarea>
            </div>
            <div class="form-group">
              <label>关联事件（可添加多条）</label>
              <div v-for="(event, index) in [...form.events].reverse()" :key="event.id" class="event-item">
                <div class="event-input-group">
                  <input 
                    type="text" 
                    v-model="event.content"
                    :placeholder="`事件 ${index + 1}...`"
                    class="event-input"
                  >
                  <button 
                    type="button" 
                    class="remove-event-btn"
                    @click="removeEvent(index)"
                    v-if="form.events.length > 1"
                  ></button>
                </div>
                <div class="event-time">
                  创建时间：{{ formatDate(event.createdAt) }}
                </div>
              </div>
              <button 
                type="button" 
                class="add-event-btn"
                @click="addEvent"
              >
                添加事件
              </button>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" @click="closeCardModal">取消</button>
              <button type="submit" class="btn btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

interface Event {
  id: number
  content: string
  createdAt: string
}

interface Thought {
  id: number
  content: string
  events: Event[]
  likes: number
  date: string
}

// 响应式数据
const thoughts = ref<Thought[]>([
  {
    id: 1,
    content: "命运反复出题，直到你给出答案。",
    events: [
      {
        id: 1,
        content: "登录认证任务",
        createdAt: "2023-10-15T14:30:00"
      }
    ],
    likes: 5,
    date: "2023-10-15T14:30:00"
  },
])

const showModal = ref(false)
const currentEditId = ref<number | null>(null)

const form = reactive({
  content: '',
  events: [
    {
      id: 1,
      content: '',
      createdAt: new Date().toISOString()
    }
  ]
})

// 计算属性
const modalTitle = computed(() => 
  currentEditId.value === null ? '添加新思考' : '编辑思考'
)

// 方法
const openAddModal = () => {
  form.content = ''
  form.event = ''
  currentEditId.value = null
  showModal.value = true
}

const openEditModal = (id: number) => {
  const thought = thoughts.value.find(t => t.id === id)
  if (thought) {
    form.content = thought.content
    form.events = thought.events.length > 0 ? [...thought.events] : [{
      id: 1,
      content: '',
      createdAt: new Date().toISOString()
    }]
    currentEditId.value = id
    showModal.value = true
  }
}

const closeCardModal = () => {
  showModal.value = false
}

const addEvent = () => {
  const newEventId = form.events.length > 0 ? Math.max(...form.events.map(e => e.id)) + 1 : 1
  form.events.push({
    id: newEventId,
    content: '',
    createdAt: new Date().toISOString()
  })
}

const removeEvent = (index: number) => {
  form.events.splice(index, 1)
}

const saveCard = () => {
  if (!form.content.trim()) {
    alert('思考内容不能为空')
    return
  }
  
  // 过滤掉空的事件内容
  const validEvents = form.events.filter(event => event.content.trim() !== '')
  
  if (currentEditId.value === null) {
    // 添加新卡片
    const newThought: Thought = {
      id: thoughts.value.length > 0 ? Math.max(...thoughts.value.map(t => t.id)) + 1 : 1,
      content: form.content.trim(),
      events: validEvents,
      likes: 0,
      date: new Date().toISOString()
    }
    
    thoughts.value.push(newThought)
  } else {
    // 编辑现有卡片
    const thought = thoughts.value.find(t => t.id === currentEditId.value)
    if (thought) {
      thought.content = form.content.trim()
      thought.events = validEvents
    }
  }
  
  closeCardModal()
}



const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  return new Date(dateString).toLocaleDateString('zh-CN', options)
}

// 生命周期
onMounted(() => {
  // 可以在这里添加初始化逻辑
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.think-container {
  background-color: #f5f7fa;
  color: #333;
  line-height: 1.6;
  padding: 20px;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

header {
  text-align: center;
  margin-bottom: 40px;
  padding: 20px 0;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: #2c3e50;
  font-weight: 300;
}

.subtitle {
  font-size: 1.1rem;
  color: #7f8c8d;
  max-width: 600px;
  margin: 0 auto;
}

.add-card-btn {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 50px;
  padding: 12px 24px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 30px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08);
}

.add-card-btn:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
}

.add-card-btn i {
  margin-right: 8px;
  font-size: 1.2rem;
}

.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.07);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  position: relative;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.card-content {
  flex-grow: 1;
  margin-bottom: 20px;
  font-size: 1.1rem;
  line-height: 1.7;
  color: #2c3e50;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.card-date {
  font-size: 0.85rem;
  color: #95a5a6;
}

.event-count {
  display: flex;
  align-items: center;
  color: #78909c;
  font-size: 0.9rem;
  padding: 5px 10px;
  border-radius: 20px;
  background-color: #f0f7ff;
  transition: all 0.2s ease;
}

.event-count:hover {
  background-color: #e1f5fe;
}

.event-count i {
  margin-right: 5px;
  color: #4fc3f7;
}

.event-count .count {
  font-weight: 600;
  color: #37474f;
}

/* 事件显示区域样式 */
.events-section {
  margin: 20px 0;
  padding: 0;
}

.events-label {
  font-size: 0.9rem;
  color: #5a6c7d;
  margin-bottom: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.events-label::before {
  content: "📝";
  font-size: 1rem;
}

.event-display {
  margin-bottom: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid #e1f5fe;
  box-shadow: 0 2px 12px rgba(66, 133, 244, 0.08);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.event-display::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(to bottom, #4fc3f7, #29b6f6);
}

.event-display:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(66, 133, 244, 0.12);
  border-color: #4fc3f7;
}

.event-display:last-child {
  margin-bottom: 0;
}

.event-content {
  font-size: 0.95rem;
  color: #37474f;
  margin-bottom: 8px;
  line-height: 1.5;
  font-weight: 500;
}

.event-time {
  font-size: 0.8rem;
  color: #78909c;
  display: flex;
  align-items: center;
  gap: 6px;
}

.event-time::before {
  content: "🕒";
  font-size: 0.9rem;
}

/* 模态框中事件输入样式 */
.event-item {
  margin-bottom: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid #e1f5fe;
  box-shadow: 0 2px 12px rgba(66, 133, 244, 0.08);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.event-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(to bottom, #4fc3f7, #29b6f6);
}

.event-item:hover {
  border-color: #4fc3f7;
  box-shadow: 0 4px 20px rgba(66, 133, 244, 0.12);
}

.event-input-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.event-input {
  flex: 1;
  margin-bottom: 0 !important;
  border: 1px solid #e3f2fd;
  border-radius: 8px;
  padding: 12px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  background-color: #fafbfc;
}

.event-input:focus {
  border-color: #4fc3f7;
  box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.1);
  background-color: #ffffff;
}

.remove-event-btn {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  font-family: Arial, sans-serif;
}

.remove-event-btn::before {
  content: "🗑";
  font-size: 0.9rem;
}

.remove-event-btn:hover {
  background: #ffebee;
  border-color: #f44336;
  color: #f44336;
}

.add-event-btn {
  background: linear-gradient(135deg, #66bb6a, #4caf50);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  margin-top: 12px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(102, 187, 106, 0.3);
}

.add-event-btn::before {
  content: "+";
  font-size: 1.2rem;
  font-weight: bold;
}

.add-event-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 187, 106, 0.4);
  background: linear-gradient(135deg, #4caf50, #388e3c);
}

/* 模态框样式 */
.modal {
  display: flex;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 1.5rem;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #7f8c8d;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 500;
}

textarea, input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  resize: vertical;
  transition: border 0.3s ease;
}

textarea:focus, input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

textarea {
  min-height: 120px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.btn-secondary {
  background-color: #ecf0f1;
  color: #2c3e50;
}

.btn-secondary:hover {
  background-color: #dde4e6;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
  grid-column: 1 / -1;
}

.empty-state i {
  font-size: 4rem;
  margin-bottom: 20px;
  color: #bdc3c7;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin-bottom: 10px;
  font-weight: 400;
}

@media (max-width: 768px) {
  .cards-container {
    grid-template-columns: 1fr;
  }
  
  h1 {
    font-size: 2rem;
  }
}
</style>