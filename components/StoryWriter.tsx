"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Frame } from "@gptscript-ai/gptscript";
import renderEventMessage from "@/lib/renderEventMessage";

const storiesPath = "public/stories"

function StoryWriter() {
    const [story, setStory ] = useState<string>("");
    const [pages, setPages] = useState<number>();
    const [progress, setProgress] = useState<string>("");
    const [runStarted, setRunStarted] = useState<boolean>(false);
    const [runFinished, setRunFinished] = useState<boolean | null>(null);
    const [currentTool, setCurrentTool] = useState("");
    const [events, setEvents] = useState<Frame[]>([])

    async function runScript() {
        setRunStarted(true)
        setRunFinished(false)

        const response = await fetch("/api/run-script", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ story, pages, path: storiesPath }),
        });
        
        if (response.ok && response.body) {
            console.log("开始故事生成");
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            handleStream(reader, decoder)
            
        } else {
            setRunStarted(false)
            setRunFinished(true)
            console.error("启动 AI 生成失败")
        }
    }

    async function handleStream(reader:ReadableStreamDefaultReader<Uint8Array>, decoder: TextDecoder) {
        while(true) {
            const {done, value} = await reader.read();
            if (done) break

            const chunk = decoder.decode(value, {stream: true})

            const eventData = chunk
                .split("\n\n")
                .filter((line) => line.startsWith("event: "))
                .map((line) => line.replace(/^event:/, ""));
            
            eventData.forEach(data => {
                try {
                    const parsedData = JSON.parse(data)
                    if (parsedData.type === "callProgress") {
                        setProgress(
                            parsedData.output[parsedData.output.length -1].content
                        )
                        setCurrentTool(parsedData.tool?.description || "")
                    } else if (parsedData.type=== "callStart") {
                        setCurrentTool(parsedData.tool?.description || "")
                    } else if (parsedData.type === "runFinish") {
                        setRunStarted(false)
                        setRunFinished(true)
                    } else {
                        setEvents((prevEvents) => [...prevEvents, parsedData])
                    }
                } catch (error) {
                    console.error("JSON解析失败,{}", error)
                }
            })
            

        }
    }

    return (
        <div className="flex flex-col container">
            <section className="flex-1 flex flex-col border border-purple-300
            rounded-md p-10 space-y-2">
                <Textarea 
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    className="flex-1 text-black"
                    placeholder="写一个关于程序员拯救世界的故事吧"
                />
                <Select onValueChange={value => setPages(parseInt(value))}>
                    <SelectTrigger>
                        <SelectValue placeholder="你计划生成一篇多长的故事呢？"/>
                    </SelectTrigger>
                    <SelectContent className="w-full">
                        {
                            Array.from({length:10}, (_,i) => (
                                <SelectItem key={i} value={String(i+1)}>
                                    {i+1}页
                                </SelectItem>
                            ))
                        }
                    </SelectContent>
                </Select>
                <Button
                    onClick={runScript}
                    disabled={!story || !pages || runStarted}
                    className="w-full" size="lg">
                        开始生成！
                </Button>
            </section>
            <section className="flex-1 pb-5 mt-5">
                <div className="flex flex-col-reverse w-full space-y-2
                bg-gray-800 rounded-md text-gray-200 font-mono p-10
                h-96 overflow-y-scroll">
                    <div>
                        {
                            runFinished === null && (
                                <>
                                    <p className="animate-pulse mr-5">
                                        等待故事生成中......
                                    </p>
                                    <br/>
                                </>
                            )
                        }
                        <span className="mr-5">
                            {">>"}
                        </span>
                        {progress}
                    </div>
                    {
                        currentTool && (
                            <div className="py-10">
                                <span className="mr-5">{"--- [Current Tool] ---"}</span>
                                {currentTool}
                            </div>
                        )
                    }
                    <div className="space-y-5">
                        {
                            events.map((event, index) => (
                                <div key={index}>
                                    <span className="mr-5">{">>"}</span>
                                    {renderEventMessage(event)}
                                </div>
                            ))
                        }
                    </div>


                    {
                        runStarted && (
                            <div>
                                <span className="mr-5 animate-in">
                                    {"--- [让我开始想一想，写好这个故事] --"}
                                </span>
                            </div>
                        )
                    }
                </div>
            </section>
        </div>
    )
}

export default StoryWriter