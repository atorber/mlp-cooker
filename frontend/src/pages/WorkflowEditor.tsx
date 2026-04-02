import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, request } from '@umijs/max';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ELK from 'elkjs/lib/elk.bundled.js';
import {
  App,
  Button,
  Input,
  Space,
  Typography,
  Tooltip,
  Divider,
  Form,
  Select,
  Tag,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  BranchesOutlined,
  CodeOutlined,
  ApiOutlined,
  RobotOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  FlagOutlined,
  CloseOutlined,
  PartitionOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  CompressOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

// ==================== 类型定义 ====================

type WorkflowNodeType = 'start' | 'llm' | 'knowledge' | 'ifelse' | 'code' | 'http' | 'end';

interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: WorkflowNodeType;
  description?: string;
  model?: string;
  prompt?: string;
  code?: string;
  url?: string;
  method?: string;
  condition?: string;
  knowledgeBase?: string;
}

type WorkflowNode = Node<WorkflowNodeData, 'custom'>;

interface NodeCategory {
  type: WorkflowNodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const NODE_CATEGORIES: NodeCategory[] = [
  { type: 'start', label: '开始', icon: <FlagOutlined />, color: '#52c41a', description: '工作流入口节点' },
  { type: 'llm', label: 'LLM', icon: <RobotOutlined />, color: '#1677ff', description: '大语言模型调用' },
  { type: 'knowledge', label: '知识检索', icon: <SearchOutlined />, color: '#722ed1', description: '从知识库检索信息' },
  { type: 'ifelse', label: '条件判断', icon: <BranchesOutlined />, color: '#fa8c16', description: 'IF/ELSE 条件分支' },
  { type: 'code', label: '代码执行', icon: <CodeOutlined />, color: '#13c2c2', description: '执行自定义代码' },
  { type: 'http', label: 'HTTP 请求', icon: <ApiOutlined />, color: '#eb2f96', description: '发送 HTTP 请求' },
  { type: 'end', label: '结束', icon: <CheckCircleOutlined />, color: '#f5222d', description: '工作流结束节点' },
];

const getNodeCategory = (type: string): NodeCategory => {
  return NODE_CATEGORIES.find((c) => c.type === type) || NODE_CATEGORIES[0];
};

// ==================== 自定义节点组件 ====================

function CustomNode({ data, selected }: { data: WorkflowNodeData; selected?: boolean }) {
  const category = getNodeCategory(data.nodeType);
  const isStart = data.nodeType === 'start';
  const isEnd = data.nodeType === 'end';
  const isIfElse = data.nodeType === 'ifelse';

  return (
    <div
      style={{
        background: '#fff',
        border: `2px solid ${selected ? category.color : '#e5e7eb'}`,
        borderRadius: 12,
        width: 240,
        boxShadow: selected
          ? `0 0 0 2px ${category.color}33`
          : '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'all 0.2s',
      }}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ width: 10, height: 10, background: '#6b7280', border: '2px solid #fff' }}
        />
      )}

      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: `${category.color}15`, color: category.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}
        >
          {category.icon}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {data.label || category.label}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{category.label}</div>
        </div>
      </div>

      {data.description && (
        <div style={{ padding: '8px 14px', fontSize: 12, color: '#6b7280', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.description}
        </div>
      )}

      {isIfElse && (
        <div style={{ padding: '4px 14px 8px', display: 'flex', justifyContent: 'space-between' }}>
          <Tag color="green" style={{ fontSize: 11 }}>True</Tag>
          <Tag color="red" style={{ fontSize: 11 }}>False</Tag>
        </div>
      )}

      {!isEnd && !isIfElse && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ width: 10, height: 10, background: category.color, border: '2px solid #fff' }}
        />
      )}

      {isIfElse && (
        <>
          <Handle type="source" position={Position.Right} id="true"
            style={{ width: 10, height: 10, background: '#52c41a', border: '2px solid #fff', top: '35%' }}
          />
          <Handle type="source" position={Position.Right} id="false"
            style={{ width: 10, height: 10, background: '#f5222d', border: '2px solid #fff', top: '65%' }}
          />
        </>
      )}
    </div>
  );
}

const nodeTypes = { custom: CustomNode } as const;

// ==================== 边样式 ====================

const defaultEdgeOptions = {
  style: { strokeWidth: 2, stroke: '#b1b1b7' },
  markerEnd: { type: MarkerType.ArrowClosed as const, color: '#b1b1b7' },
  type: 'smoothstep',
};

// ==================== 默认节点 ====================

const createDefaultNodes = (): WorkflowNode[] => [
  { id: 'start-1', type: 'custom' as const, position: { x: 100, y: 200 }, data: { label: '开始', nodeType: 'start' as const, description: '用户输入' } },
  { id: 'end-1', type: 'custom' as const, position: { x: 600, y: 200 }, data: { label: '结束', nodeType: 'end' as const, description: '输出结果' } },
];

const createDefaultEdges = (): Edge[] => [
  { id: 'start-1->end-1', source: 'start-1', target: 'end-1', ...defaultEdgeOptions },
];

// ==================== ELK 自动布局 ====================

const elk = new ELK();

const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;

async function getLayoutedElements(nodes: Node[], edges: Edge[], direction: 'RIGHT' | 'DOWN' = 'RIGHT') {
  const isHorizontal = direction === 'RIGHT';

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      'elk.edgeRouting': 'SPLINES',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layouted = await elk.layout(elkGraph);

  const layoutedNodes = nodes.map((node) => {
    const elkNode = layouted.children?.find((n) => n.id === node.id);
    if (elkNode) {
      return {
        ...node,
        position: {
          x: elkNode.x ?? node.position.x,
          y: elkNode.y ?? node.position.y,
        },
      };
    }
    return node;
  });

  return { nodes: layoutedNodes, edges };
}

// ==================== 左侧节点面板 ====================

function NodePanel({ onDragStart }: { onDragStart: (event: React.DragEvent, nodeType: WorkflowNodeType) => void }) {
  return (
    <div style={{ width: 220, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      <div style={{ padding: '16px 14px 8px', fontWeight: 600, fontSize: 14, color: '#374151' }}>
        节点面板
      </div>
      <div style={{ padding: '0 10px', flex: 1, overflowY: 'auto' }}>
        {NODE_CATEGORIES.map((cat) => (
          <div
            key={cat.type}
            draggable
            onDragStart={(e) => onDragStart(e, cat.type)}
            style={{
              padding: '10px 12px', marginBottom: 6, background: '#fafafa',
              borderRadius: 8, cursor: 'grab', display: 'flex', alignItems: 'center',
              gap: 10, border: '1px solid #f0f0f0', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${cat.color}08`; e.currentTarget.style.borderColor = `${cat.color}40`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${cat.color}15`, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
              {cat.icon}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#374151' }}>{cat.label}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{cat.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 右侧配置面板 ====================

function ConfigPanel({ node, onClose, onUpdate, onDelete }: {
  node: WorkflowNode;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  onDelete: (nodeId: string) => void;
}) {
  const [form] = Form.useForm();
  const category = getNodeCategory(node.data.nodeType);
  const nodeType = node.data.nodeType;

  useEffect(() => {
    form.setFieldsValue({
      label: node.data.label || '',
      description: node.data.description || '',
      model: node.data.model || 'ernie-4.5',
      prompt: node.data.prompt || '',
      code: node.data.code || '',
      url: node.data.url || '',
      method: node.data.method || 'GET',
      condition: node.data.condition || '',
      knowledgeBase: node.data.knowledgeBase || '',
    });
  }, [node.id, form]);

  const handleValuesChange = (_: any, allValues: any) => {
    onUpdate(node.id, allValues);
  };

  return (
    <div style={{ width: 340, background: '#fff', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: `${category.color}15`, color: category.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            {category.icon}
          </div>
          <Text strong>{category.label}</Text>
        </Space>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <Form form={form} layout="vertical" size="small" onValuesChange={handleValuesChange}>
          <Form.Item name="label" label="节点名称">
            <Input placeholder="输入节点名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="输入节点描述" />
          </Form.Item>

          {nodeType === 'llm' && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Form.Item name="model" label="模型">
                <Select options={[
                  { value: 'ernie-4.5', label: 'ERNIE 4.5' },
                  { value: 'ernie-4.0', label: 'ERNIE 4.0' },
                  { value: 'ernie-3.5', label: 'ERNIE 3.5' },
                  { value: 'deepseek-r1', label: 'DeepSeek R1' },
                  { value: 'qwen-max', label: 'Qwen Max' },
                ]} />
              </Form.Item>
              <Form.Item name="prompt" label="提示词">
                <TextArea rows={6} placeholder={'输入提示词模板，使用 {{变量名}} 引用变量'} />
              </Form.Item>
            </>
          )}

          {nodeType === 'knowledge' && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Form.Item name="knowledgeBase" label="知识库">
                <Select placeholder="选择知识库" options={[
                  { value: 'default', label: '默认知识库' },
                  { value: 'docs', label: '文档知识库' },
                  { value: 'faq', label: 'FAQ 知识库' },
                ]} />
              </Form.Item>
            </>
          )}

          {nodeType === 'ifelse' && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Form.Item name="condition" label="条件表达式">
                <TextArea rows={3} placeholder={'例如: {{input}} contains "关键词"'} />
              </Form.Item>
            </>
          )}

          {nodeType === 'code' && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Form.Item name="code" label="代码">
                <TextArea rows={8} placeholder="输入 Python/JavaScript 代码" style={{ fontFamily: 'monospace', fontSize: 12 }} />
              </Form.Item>
            </>
          )}

          {nodeType === 'http' && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Form.Item name="method" label="请求方法">
                <Select options={[
                  { value: 'GET', label: 'GET' },
                  { value: 'POST', label: 'POST' },
                  { value: 'PUT', label: 'PUT' },
                  { value: 'DELETE', label: 'DELETE' },
                ]} />
              </Form.Item>
              <Form.Item name="url" label="请求 URL">
                <Input placeholder="https://api.example.com/endpoint" />
              </Form.Item>
            </>
          )}
        </Form>
      </div>

      {nodeType !== 'start' && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
          <Button danger block icon={<DeleteOutlined />} onClick={() => onDelete(node.id)}>
            删除节点
          </Button>
        </div>
      )}
    </div>
  );
}

// ==================== 主编辑器 ====================

function WorkflowEditorInner() {
  const { id } = useParams<{ id: string }>();
  const { message: messageApi } = App.useApp();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const { fitView } = useReactFlow();

  const [workflowName, setWorkflowName] = useState('');
  const [workflowDesc, setWorkflowDesc] = useState('');
  const [publishStatus, setPublishStatus] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [editingName, setEditingName] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState(createDefaultNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(createDefaultEdges());

  // 加载工作流数据
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!id) return;
      try {
        const response = await request(`/api/workflows/${id}`, { method: 'GET' });
        if (response.success) {
          const wf = response.data;
          setWorkflowName(wf.name || '');
          setWorkflowDesc(wf.description || '');
          setPublishStatus(wf.publishStatus || 'draft');
          if (wf.nodes && wf.nodes.length > 0) {
            setNodes(wf.nodes);
            setEdges(wf.edges || []);
          }
        } else {
          messageApi.error('加载工作流失败');
        }
      } catch (error) {
        console.error('加载工作流失败:', error);
        messageApi.error('加载工作流失败');
      } finally {
        setLoading(false);
      }
    };
    loadWorkflow();
  }, [id]);

  // 保存
  const handleSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const response = await request(`/api/workflows/${id}`, {
        method: 'PUT',
        data: { name: workflowName, description: workflowDesc, nodes, edges },
      });
      if (response.success) {
        messageApi.success('保存成功');
      } else {
        messageApi.error(response.message || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      messageApi.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [id, workflowName, workflowDesc, nodes, edges, messageApi]);

  // 连线
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    [setEdges],
  );

  // 节点点击
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as WorkflowNode);
  }, []);

  // 画布点击
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  // 更新节点
  const handleUpdateNode = useCallback((nodeId: string, data: Partial<WorkflowNodeData>) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
    setSelectedNode((prev) => prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev);
  }, [setNodes]);

  // 删除节点
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  // 整理节点（自动布局）
  const handleOrganize = useCallback(async () => {
    if (nodes.length === 0) return;
    setOrganizing(true);
    try {
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(nodes, edges, 'RIGHT');
      setNodes(layoutedNodes as WorkflowNode[]);
      setEdges(layoutedEdges);
      window.requestAnimationFrame(() => {
        fitView({ padding: 0.3, duration: 300 });
      });
    } catch (error) {
      console.error('整理节点失败:', error);
      messageApi.error('整理节点失败');
    } finally {
      setOrganizing(false);
    }
  }, [nodes, edges, setNodes, setEdges, fitView, messageApi]);

  // 拖拽
  const onDragStart = useCallback((event: React.DragEvent, nodeType: WorkflowNodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const nodeType = event.dataTransfer.getData('application/reactflow') as WorkflowNodeType;
    if (!nodeType || !reactFlowInstance || !reactFlowWrapper.current) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    const cat = getNodeCategory(nodeType);
    const newNode: WorkflowNode = {
      id: `${nodeType}-${Date.now()}`,
      type: 'custom',
      position,
      data: { label: cat.label, nodeType, description: cat.description },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [reactFlowInstance, setNodes]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f7f8fa' }}>
      {/* 顶部工具栏 */}
      <div style={{ height: 52, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, zIndex: 10 }}>
        <Space size={12}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} style={{ color: '#6b7280' }} />
          <Divider type="vertical" />
          {editingName ? (
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onPressEnter={() => setEditingName(false)}
              autoFocus
              style={{ width: 240, fontWeight: 600 }}
            />
          ) : (
            <Text strong style={{ fontSize: 16, cursor: 'pointer' }} onClick={() => setEditingName(true)}>
              {workflowName || '未命名工作流'}
            </Text>
          )}
          <Tag color={publishStatus === 'published' ? 'success' : 'default'}>
            {publishStatus === 'published' ? '已发布' : '草稿'}
          </Tag>
        </Space>
        <Space>
          <Tooltip title="运行测试">
            <Button icon={<PlayCircleOutlined />}>测试运行</Button>
          </Tooltip>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            保存
          </Button>
        </Space>
      </div>

      {/* 主体 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <NodePanel onDragStart={onDragStart} />

        <div ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes as any}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode={['Backspace', 'Delete']}
            snapToGrid
            snapGrid={[16, 16] as [number, number]}
            minZoom={0.2}
            maxZoom={2}
          >
            <Panel position="bottom-left" style={{ margin: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: '#fff', borderRadius: 8, padding: 4,
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb',
              }}>
                <Tooltip title="放大">
                  <Button type="text" size="small" icon={<ZoomInOutlined />}
                    onClick={() => reactFlowInstance?.zoomIn({ duration: 200 })}
                    style={{ width: 32, height: 32 }}
                  />
                </Tooltip>
                <Tooltip title="缩小">
                  <Button type="text" size="small" icon={<ZoomOutOutlined />}
                    onClick={() => reactFlowInstance?.zoomOut({ duration: 200 })}
                    style={{ width: 32, height: 32 }}
                  />
                </Tooltip>
                <Tooltip title="适应画布">
                  <Button type="text" size="small" icon={<CompressOutlined />}
                    onClick={() => fitView({ padding: 0.3, duration: 300 })}
                    style={{ width: 32, height: 32 }}
                  />
                </Tooltip>
                <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
                <Tooltip title="整理节点">
                  <Button type="text" size="small" icon={<PartitionOutlined />}
                    loading={organizing}
                    onClick={handleOrganize}
                    style={{ width: 32, height: 32 }}
                  />
                </Tooltip>
              </div>
            </Panel>
            <MiniMap
              position="bottom-right"
              style={{ bottom: 16, right: 70 }}
              nodeColor={(n: any) => getNodeCategory(n.data?.nodeType || '').color}
              maskColor="rgba(0,0,0,0.08)"
              pannable
              zoomable
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#d1d5db" />
          </ReactFlow>
        </div>

        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
          />
        )}
      </div>
    </div>
  );
}

// ==================== 导出 ====================

const WorkflowEditor: React.FC = () => (
  <ReactFlowProvider>
    <WorkflowEditorInner />
  </ReactFlowProvider>
);

export default WorkflowEditor;
