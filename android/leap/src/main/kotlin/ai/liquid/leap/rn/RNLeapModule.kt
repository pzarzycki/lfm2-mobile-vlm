package ai.liquid.leap.rn

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import ai.liquid.leap.LeapClient
import ai.liquid.leap.ModelRunner
import ai.liquid.leap.message.MessageResponse

class RNLeapModule(private val reactCtx: ReactApplicationContext) : ReactContextBaseJavaModule(reactCtx) {

  private var runner: ModelRunner? = null
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

  override fun getName() = "RNLeap"

  @ReactMethod
  fun loadModel(bundlePath: String, promise: Promise) {
    scope.launch {
      try {
        runner = LeapClient.loadModel(bundlePath)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("LOAD_FAIL", e)
      }
    }
  }

  @ReactMethod
  fun ensureAssetCopied(assetName: String, promise: Promise) {
    // Copies an asset (placed under android/app/src/main/assets/models) to app files dir if not present
    scope.launch {
      try {
        val ctx = reactCtx
        val dest = java.io.File(ctx.filesDir, assetName)
        if (!dest.exists()) {
          ctx.assets.open("models/$assetName").use { input ->
            dest.outputStream().use { output -> input.copyTo(output) }
          }
        }
        promise.resolve(dest.absolutePath)
      } catch (t: Throwable) {
        promise.reject("ASSET_COPY_FAIL", t)
      }
    }
  }

  @ReactMethod
  fun unloadModel(promise: Promise) {
    scope.launch {
      try {
  runner?.unload()
        runner = null
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("UNLOAD_FAIL", e)
      }
    }
  }

  @ReactMethod
  fun startStream(messages: ReadableArray, options: com.facebook.react.bridge.ReadableMap?, promise: Promise) {
    val r = runner ?: run { promise.reject("NO_MODEL", "Model not loaded"); return }
    val streamId = java.util.UUID.randomUUID().toString()
    promise.resolve(streamId)

    val convo = r.createConversation(systemPrompt = null)
    val userMsg = MessageConverters.toLeapUserMessage(messages)

    scope.launch {
      convo.generateResponse(userMsg)
        .onEach { resp ->
          when (resp) {
            is MessageResponse.Chunk -> emit("leap:chunk", Arguments.createMap().apply {
              putString("streamId", streamId); putString("text", resp.text)
            })
            is MessageResponse.ReasoningChunk -> emit("leap:reasoning", Arguments.createMap().apply {
              putString("streamId", streamId); putString("text", resp.reasoning)
            })
            is MessageResponse.FunctionCalls -> emit("leap:function_calls", Arguments.createMap().apply {
              putString("streamId", streamId); putString("count", resp.functionCalls.size.toString())
            })
            is MessageResponse.Complete -> emit("leap:done", Arguments.createMap().apply {
              putString("streamId", streamId)
              resp.stats?.let { s ->
                // Provide tokens per second if available (field may be tokenPerSecond depending on SDK version)
                try {
                  val kClass = s::class
                  val tpsProp = kClass.members.firstOrNull { it.name == "tokenPerSecond" || it.name == "tokensPerSecond" }
                  val tpsVal = tpsProp?.call(s) as? Number
                  tpsVal?.toDouble()?.let { putDouble("tps", it) }
                } catch (_: Throwable) {}
              }
            })
          }
        }
        .catch { t ->
          emit("leap:error", Arguments.createMap().apply {
            putString("streamId", streamId); putString("error", t.message ?: "error")
          })
        }
        .collect {}
    }
  }

  private fun emit(event: String, params: com.facebook.react.bridge.WritableMap) {
    reactCtx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(event, params)
  }
}
