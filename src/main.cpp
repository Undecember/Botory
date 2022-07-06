#include <dpp/dpp.h>

using namespace std;
 
const string BOT_TOKEN = "OTUzNTQ4ODk0MzQyNjEwOTY0.Ghjfnd.nHs0Wa1EV9rDMxeC-NInqA_L6CWy0jBvzPjS64";
 
int main() {
    dpp::cluster bot(BOT_TOKEN);
 
    bot.on_log(dpp::utility::cout_logger());
 
    bot.on_slashcommand([](const dpp::slashcommand_t& event) {
         if (event.command.get_command_name() == "ping") {
            event.reply("Pong!");
        }
    });
 
    bot.on_ready([&bot](const dpp::ready_t& event) {
        if (dpp::run_once<struct register_bot_commands>()) {
            bot.global_command_create(
                dpp::slashcommand("ping", "Ping pong!", bot.me.id)
            );
        }
    });
 
    bot.start(false);
}
