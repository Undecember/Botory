cmake_minimum_required(VERSION 3.15)
project(botory VERSION 6.0.0 DESCRIPTION "A discord bot for the discord server THE STORIES")
add_subdirectory(libs/DPP)
add_executable(${PROJECT_NAME}
    src/main.cpp
)
target_link_libraries(${PROJECT_NAME}
    dpp
)
target_include_directories(${PROJECT_NAME} PRIVATE
    libs/DPP/include
)
set_target_properties(${PROJECT_NAME} PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)
