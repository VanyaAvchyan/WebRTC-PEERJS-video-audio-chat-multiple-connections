;

$(function () {
    var token = $('meta[name=token]').attr("content");
    if(!token)
    {
        alert('Token is missing');
        return;
    }

    $.ajax({
        type:"post",
        url: 'http://localhost:4000/token',
        contentType: 'application/json',
        data: JSON.stringify({token:token}),
        dataType: 'json',
        cache: false,
        timeout: 1000,
        success: function(response){
            console.log( "CSRF token set success", response );
            initChat();
        },
        error: function(jqXHR, textStatus, errorThrown){
            console.log('CSRF token set error ' + textStatus + " " + errorThrown);;
        }
    });
    // Init chat part
    function initChat()
    {
        navigator.getUserMedia = navigator.getUserMedia ||
                                 navigator.webkitGetUserMedia ||
                                 navigator.mozGetUserMedia;
        window.active_call_data = {};
        var UUID = $('.auth_user').data('room');
        var auth_user_id = $('.auth_user').data('user_id');
        var localVideo = document.getElementById('localVideo');
        var socket = io.connect('http://localhost:4000?token='+token+'&room='+UUID);
        // Connect to peer signaling server
        var peer = new Peer({
            host: 'localhost',
            port: 9000,
            path: '/peerjs',
            key: UUID,
        });
        /**
         * Socket listeners
         */
        // Socket io connection listeners
        socket.on('connect', function() {
            // Select rooms and send emit to join_room
            $('.__user').each(function(k,el)
            {
                var room = $(el).data('room'); // room name
                var user_id = $(el).data('user_id'); // user into room
                var user_UUID = $(el).data('uuid'); // user into room

                if(!room)
                {
                    console.log("Room is empty");
                    return;
                }
                var users = [
                    {
                        "user_id": auth_user_id,
                        "UUID"   : UUID
                    },
                    {
                        "user_id": user_id,
                        "UUID"   : user_UUID
                    }
                ];
                socket.emit('join_room', {room : room, users: users});
            });
            peer.on('open', function(peer_id) {
                var data = {user_id: auth_user_id, UUID : UUID, peer_id: peer_id};
                socket.emit('peer-connection', data);
                console.log('Peer connect success', peer_id);
                active_call_data.peer_id = peer_id;
            });
            console.log('socket connect success');
        });
        // Socket call_offer listener
        socket.on('call_offer', function(data)
        {
            $('.call_offer').attr('disabled',true);
            $('.answer_reject_buttons').show();
            if(hasActiveCall())
            {
                data.message = 'Room is busy';
                if(data.from === UUID)
                {
                    $('.message__info').text('Room is busy by you');
                    return;
                }
                socket.emit('call_busy', data);
                return;
            }
            active_call_data.room = data.room;
            if(data.user_id === UUID)
            {
                $('.call_hang_up').attr('data-peer_id', data.peer_id);
            }
            if(data.from === UUID)
            {
                $('.call_answer').hide();
                $('.call_reject').hide();
            } else {
                $('.message__info').text('Incoming call from '+data.from+' into room '+data.room);
                $('.call_answer').attr('data-peer_id' , data.peer_id);
            }
        });

        // Socket call_busy listener
        socket.on('call_busy', function(data)
        {
            hangUp(data.message);
        });

        // Socket call-hang-up listener
        socket.on('call-hang-up', function(data)
        {
            hangUp();
        });

        // Socket chat_message listener
        socket.on('chat_message', function(data)
        {
            if(active_call_data.room == data.room)
            {
                var li = "<li>"+data.message+"</li>";
                $('.messages__list').append(li);
                $('.chat__form button[type=submit]').attr('disabled', false);
                return;
            }
            //unread__messages_count
            var user = $('.__user[data-room='+data.room+'] .unread__messages_count');
            var unread_msgs_cnt = +user.text();
            user.text(++unread_msgs_cnt);
        });

        // Socket join_room_group listener
        socket.on('join_room_group', function(data)
        {
            socket.emit('join_room', data);
            addGroup(data.room, data.room_name);
            console.log('join_room_group', data);
        });
        /**
         * Click and submit events
         */
        // Button call_offer click
        $('.call_offer').on('click', function()
        {
            if(hasActiveCall())
            {
                $('.message__info').text('You are already busy');
                console.log('You are already busy');
                return;
            }
            active_call_data.room = $(this).data('room');
            socket.emit('call_offer', {room : active_call_data.room, from : UUID});
            call_offer();
            console.log('call offer sent');

            console.log('===== 222222222 ====='); return;
        });

        // Button call_answer click
        $('.call_answer').on('click', function()
        {
            if(hasActiveCall())
            {
                $('.message__info').text('Has active call');
                console.log('Has active call');
                return;
            }
            var to = $(this).data('peer_id');
            if(to)
            {
                answer(to);
                $('.call_answer').attr('disabled', true);
                return;
            }
            console.log('answer peer id denied');
        });

        // Button call_hang_up click
        $('.call_hang_up').on('click', function(){
            hangUp();
            console.log('Button call_hang_up is incorrect', active_call_data);
        });

        // Form chat__form submit
        $('.chat__form').on('submit', function(e){
            e.preventDefault();
            if(!active_call_data.room)
            {
                alert('Select room');
                return;
            }
            var message = $(this).find('.__message').val();
            if(!message)
                return;
            socket.emit('chat_message', {
                "room"  : active_call_data.room,
                "from"    : UUID,
                "message" : message
            });
            $(this).find('button[type=submit]').attr('disabled', true);
            $(this).find('.__message').val('');
        });

        // Button select__room click
        $(document).on('click', '.select__room', function(){
            active_call_data.room = $(this).data('room');
            $('.__room').text(active_call_data.room);
        });

        // From  create__group__form submit
        $('.create__group__form').on('submit', function(e){
            e.preventDefault();

            var users = $(this).find('option:selected');
            if(!users.length)
            {
                console.log('Group is empty');
                return;
            }
            var room = [];
            var room_name = UUID;
            var room_users = [
                {
                    "user_id"     : UUID,
                    "group_admin" : UUID
                }
            ];

            for(var i=0; i < users.length; i++)
            {
                var option = $(users[i]).val();
                room.push(+option);
                room_name += ','+option;
                room_users.push(
                    {
                        "user_id"     : +option,
                        "group_admin" : UUID
                    }
                );
            }
            room.sort();
            room = md5(room.join());
            room_users.forEach(function(user, key)
            {
                room_users[key]['room'] = md5(room);
                room_users[key]['room_name'] = room_name;
            });
            console.log(room, room_name, room_users);

            socket.emit('join_room_group', room_users);
        });

        /**
         * Functions
         */
        function addGroup(room, room_name)
        {
            var selectedGroupButtons =
                    `${room_name}
                    <button
                        class="select__room"
                        data-room="${room}"
                    >Select room</button>
                    <button class="call_offer __user"
                         data-room="${room}"
                         data-user_ids="${room_name}"
                         >Call <span class="unread__messages_count"></span>
                     </button>`;
            $('.__groups ul').append(selectedGroupButtons);
        }


        function answer(to)
        {
            navigator.getUserMedia({audio: true, video: true},
            function(stream)
            {
                var call = peer.call(to, stream);
                call.on('stream', function(remoteStream)
                {
                    console.log('Zangox');
                    window.active_call_data.call = call;
                    $('#localVideo').attr('src', URL.createObjectURL(stream));
                    var remoteVideoElement = $('<video />', {
                                id: call.id,
                                src: URL.createObjectURL(remoteStream),
                                autoplay: true
                            });
                    remoteVideoElement.appendTo($('.remote__videos'));
                });
                call.on('close', function(){
                    hangUp();
                });
            }, function() {
                alert("Error! Make sure to click allow when asked for permission by the browser");
            });
        }

        function call_offer()
        {
            peer.on('call', function(call) {
                window.active_call_data.call = call;
                navigator.getUserMedia({video: true, audio: true},
                    function(stream)
                    {
                        call.answer(stream);
                        call.on('stream', function(remoteStream)
                        {
                            console.log('Patasxanox');
                            // $('.answer_reject_buttons').show();
                            $('#localVideo').attr('src', URL.createObjectURL(stream));
                            var remoteVideoElement = $('<video />', {
                                id: call.id,
                                src: URL.createObjectURL(remoteStream),
                                autoplay: true
                            });
                            remoteVideoElement.appendTo($('.remote__videos'));
                        });
                        call.on('close', function(){
                            hangUp();
                        });
                    }, function(err) {
                        console.log('Failed to get local stream' , err);
                    });
            });
        }

        function hasActiveCall()
        {
            if(active_call_data.call)
            {
                return "Cal already exists";
            }
            return false;
        }
        function hangUp(msg)
        {
            if(active_call_data.call)
            {
                active_call_data.call.close();
                active_call_data.call = null;
            }
            $('.answer_reject_buttons').hide();
            $('.remote__videos video').remove();
            $('.call_answer').show();
            $('.call_reject').show();
            localVideo.src = '';
            $('.message__info').text('');
            if(msg)
                $('.message__info').text(msg);
            $('.call_offer').attr('disabled',false);
            socket.emit('call-hang-up', {"from": UUID, "room" : active_call_data.room});
            active_call_data.room = null;
        }
    }

});