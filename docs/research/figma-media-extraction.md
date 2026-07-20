# Figma 图片与视频素材提取结论

核对日期：2026-07-19  
目标文件：`9XnsITgb7ak7CMT9fDLLVd`  
当前动效节点：`373:759`（头图 Banner）、`373:760`（连接算力背景）

## 结论

- 图片可以通过公开 API 获取原始文件字节。
- 现有视频不能通过公开 Plugin API 或 REST API 读取原始文件字节；`videoHash` 只是标识，不是下载地址。
- 当前文件的视频应优先从 Figma Dev Mode 的 Assets 面板下载。Figma 官方说明该面板支持下载 MP4 视频节点，也支持下载图片的原始全分辨率源文件。

## 1. Plugin API

### 图片

`ImagePaint` 暴露 `imageHash`。通过 `figma.getImageByHash(imageHash)` 得到 `Image`，再调用 `Image.getBytesAsync()`，即可取得图片“按磁盘存储形式”的原始编码字节。Figma 官方示例明确说这些字节可用于下载或上传。

```ts
const paint = node.fills.find(fill => fill.type === 'IMAGE')
if (paint?.type === 'IMAGE' && paint.imageHash) {
  const image = figma.getImageByHash(paint.imageHash)
  const bytes = await image?.getBytesAsync()
}
```

来源：[Image API](https://developers.figma.com/docs/plugins/api/Image/)、[Working with Images](https://developers.figma.com/docs/plugins/working-with-images/)、[官方 Plugin API typings：ImagePaint / Image](https://github.com/figma/plugin-typings/blob/master/plugin-api.d.ts#L4570-L4582)

### 视频

`VideoPaint` 只暴露 `videoHash`。公开的 `Video` 类型只有只读 `hash`；没有 `getBytesAsync()`。`figma` 全局对象也只有用于导入视频的 `createVideoAsync(data)`，没有 `getVideoByHash()`。因此公开 Plugin API 无法从已有 `VIDEO` fill 反向取得原视频字节。

来源：[VideoPaint API](https://developers.figma.com/docs/plugins/api/Paint/#videopaint)、[Video API](https://developers.figma.com/docs/plugins/api/Video/)、[官方 Plugin API typings：VideoPaint / Video](https://github.com/figma/plugin-typings/blob/master/plugin-api.d.ts#L4606-L4618)

## 2. REST API

`GET /v1/files/:key` 的 Paint 类型枚举包含 `VIDEO`，可用于识别节点填充类型；但 Figma 公布的文件端点只提供：

- `GET /v1/images/:key`：把节点渲染成 PNG/JPG/SVG/PDF；这是静态渲染，不是源视频。
- `GET /v1/files/:key/images`：把 `imageRef` 映射为图片下载 URL；URL 最多 14 天过期，需要 `file_content:read`。

官方文件端点和官方 OpenAPI 仓库均没有“按 `videoHash`/视频引用下载原视频”的公开 REST 端点。因此 REST API 能拿图片源文件，不能拿当前两个动效的原视频。

来源：[REST File endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/)、[REST Paint properties](https://developers.figma.com/docs/rest-api/file-property-types/#paint)、[官方 REST OpenAPI 规范](https://github.com/figma/rest-api-spec)

REST 图片源文件流程：

```text
GET /v1/files/9XnsITgb7ak7CMT9fDLLVd
  -> 收集 Paint.imageRef
GET /v1/files/9XnsITgb7ak7CMT9fDLLVd/images
  -> imageRef 对应的临时下载 URL
```

不要把 `GET /v1/images/:key?ids=...` 当成源文件下载；它返回的是节点渲染结果。

## 3. 当前文件的可执行方案

### 视频：走 Dev Mode Assets 下载

1. 打开目标 Figma 文件，按 `Shift D` 进入 Dev Mode。
2. 分别选择 `373:759` 和 `373:760`。
3. 在右侧 Inspect 的 Assets 区域找到视频资源并点击下载；Figma 官方说明这里可下载 MP4 视频节点。
4. 如果 Assets 区域没有出现下载项，先确认账号处于付费计划且拥有 Full 或 Dev seat。若仍不出现，则公开 API 没有备用下载端点，只能找设计方要原文件，或临时捕获编辑器加载的媒体请求；后者属于未公开实现，不适合做稳定自动化。

### 图片：API 或 Dev Mode 均可

- 自动化：通过 Plugin API 的 `imageHash -> getImageByHash() -> getBytesAsync()`；或 REST 的 `imageRef -> /files/:key/images`。
- 手工兜底：Dev Mode 的 Assets 面板选择 `Source image file`，可下载首次导入 Figma 的原始全分辨率图片。

Figma 官方依据：[Guide to Dev Mode：Assets 支持 MP4 和原始图片](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode#h_01HRPC83E90J1KBJ72XFHZ673K)、[Guide to inspecting：Source image file](https://help.figma.com/hc/en-us/articles/22012921621015-Guide-to-inspecting)

## 为什么 MCP 只能拿到静态图

当前 Figma MCP 能调用的截图/渲染能力本质上走的是节点像素渲染，因此 `VIDEO` fill 会被定格成一帧。公开 Plugin API 又没有读取已有视频字节的能力，所以 MCP 返回静态 PNG 而不是 MP4 是公开 API 边界所致，并非节点损坏。
