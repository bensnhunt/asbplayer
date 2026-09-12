import type { Command, Message, SubtitleGenerationMessage } from '@project/common';
import { requestWhisperServer } from '@project/extension/src/services/whisper-server';

export default class SubtitleGenerationHandler {
    get sender() {
        return 'asbplayer-video';
    }

    get command() {
        return 'subtitle-generation';
    }

    handle(command: Command<Message>, _sender: Browser.runtime.MessageSender, sendResponse: (response?: any) => void) {
        void requestWhisperServer(command.message as SubtitleGenerationMessage).then(sendResponse);
        return true;
    }
}
