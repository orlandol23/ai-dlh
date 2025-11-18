// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LearningProgress
 * @dev Registra progresso educacional na blockchain
 * @notice Este contrato permite que usuários registrem conclusões de módulos educacionais
 */
contract LearningProgress is Ownable, ReentrancyGuard {

    /// @dev Estrutura que representa uma conclusão de módulo
    struct Completion {
        uint256 moduleId;
        uint256 score;
        uint256 timestamp;
        string moduleTopic;
    }

    /// @dev Mapping que armazena o progresso de cada usuário
    mapping(address => Completion[]) private userProgress;

    /// @dev Contador global de conclusões
    uint256 public totalCompletions;

    /// @dev Evento emitido quando um módulo é concluído
    event ModuleCompleted(
        address indexed user,
        uint256 indexed moduleId,
        uint256 score,
        uint256 timestamp,
        string moduleTopic
    );

    /**
     * @dev Construtor do contrato
     * @notice Inicializa o contrato com o deployer como owner
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Registra conclusão de módulo
     * @param _moduleId ID do módulo
     * @param _score Score 0-100
     * @param _moduleTopic Tópico do módulo
     * @notice Qualquer usuário pode registrar sua própria conclusão
     */
    function recordCompletion(
        uint256 _moduleId,
        uint256 _score,
        string memory _moduleTopic
    ) external nonReentrant {
        require(_score <= 100, "Score must be 0-100");
        require(bytes(_moduleTopic).length > 0, "Topic cannot be empty");
        require(_moduleId > 0, "Invalid module ID");

        Completion memory newCompletion = Completion({
            moduleId: _moduleId,
            score: _score,
            timestamp: block.timestamp,
            moduleTopic: _moduleTopic
        });

        userProgress[msg.sender].push(newCompletion);
        totalCompletions++;

        emit ModuleCompleted(
            msg.sender,
            _moduleId,
            _score,
            block.timestamp,
            _moduleTopic
        );
    }

    /**
     * @dev Retorna progresso completo do usuário
     * @param _user Endereço do usuário
     * @return Array de completions do usuário
     */
    function getUserProgress(address _user)
        external
        view
        returns (Completion[] memory)
    {
        return userProgress[_user];
    }

    /**
     * @dev Retorna contagem de módulos concluídos
     * @param _user Endereço do usuário
     * @return Número de módulos concluídos
     */
    function getUserCompletionCount(address _user)
        external
        view
        returns (uint256)
    {
        return userProgress[_user].length;
    }

    /**
     * @dev Calcula score médio do usuário
     * @param _user Endereço do usuário
     * @return Score médio (0-100), retorna 0 se não houver completions
     */
    function getUserAverageScore(address _user)
        external
        view
        returns (uint256)
    {
        Completion[] memory completions = userProgress[_user];
        if (completions.length == 0) return 0;

        uint256 totalScore = 0;
        for (uint256 i = 0; i < completions.length; i++) {
            totalScore += completions[i].score;
        }

        return totalScore / completions.length;
    }

    /**
     * @dev Retorna uma conclusão específica do usuário
     * @param _user Endereço do usuário
     * @param _index Índice da conclusão no array
     * @return Completion na posição especificada
     */
    function getUserCompletionByIndex(address _user, uint256 _index)
        external
        view
        returns (Completion memory)
    {
        require(_index < userProgress[_user].length, "Index out of bounds");
        return userProgress[_user][_index];
    }
}
