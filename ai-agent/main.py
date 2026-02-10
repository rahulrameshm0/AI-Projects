# ai-agent % uv add langgraph langchain python-dotenv langchain-openai  

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langchain.tools import tool
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv

load_dotenv()


def main():
    model = ChatOpenAI(temperature=0)

    tools = []
    agent_excutor = create_react_agent(model, tools)

    print('Welcome, I am your AI assistent can you tell me how can I help you! or Type(q) to quit')
    print('You can ask me to perform calculation or chat with me')

    while True:
        user_input = input("\nYou: ").strip()

        if user_input == 'q':
            break
        print("\nAI: ", end="")
        for chunk in agent_excutor.stream(
            {"messages": [HumanMessage(content=user_input)]}
        ):
            if "agent" in chunk and "messages" in chunk["agent"]:
                for message in chunk['agent']['messages']:
                    print(message.content, end="")
            print()

if __name__== "__main__":
    main()