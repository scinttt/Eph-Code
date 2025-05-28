package com.EphAI.Eph_Code.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import jakarta.annotation.Resource;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.messages.AssistantMessage;

@Component
public class OllamaAiInvoke implements CommandLineRunner{
    @Resource
    private ChatModel ollamaModel;

    @Override
    public void run(String... args) throws Exception {
        AssistantMessage output = ollamaModel.call(new Prompt("Hello, I am Eph"))
                                                .getResult()
                                                .getOutput();
        System.out.println(output.getText());
    }
}
