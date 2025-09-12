package ai.liquid.leap.rn

import com.facebook.react.bridge.ReadableArray
import ai.liquid.leap.message.ChatMessage
import ai.liquid.leap.message.ChatMessageContent
import android.util.Base64
import android.graphics.BitmapFactory
import kotlinx.coroutines.runBlocking

object MessageConverters {
  // Currently only text parts are supported in this bridge. Image parts can be added later.
  fun toLeapUserMessage(arr: ReadableArray): ChatMessage {
    val contents = mutableListOf<ChatMessageContent>()
    for (i in 0 until arr.size()) {
      val it = arr.getMap(i) ?: continue
      when (it.getString("type")) {
        "text" -> contents += ChatMessageContent.Text(it.getString("text") ?: "")
        "image_base64" -> {
          val b64 = it.getString("data")
          if (!b64.isNullOrEmpty()) {
            try {
              val data = Base64.decode(b64, Base64.DEFAULT)
              val bmp = BitmapFactory.decodeByteArray(data, 0, data.size)
              // fromBitmap is suspend; use runBlocking to obtain image content synchronously
              val img = runBlocking { ChatMessageContent.Image.fromBitmap(bmp) }
              contents += img
            } catch (_: Throwable) {}
          }
        }
      }
    }
    return ChatMessage(role = ChatMessage.Role.USER, content = contents)
  }
}
